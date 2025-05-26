/**
 * DocumentBuilder - Interfaccia principale per la creazione di documenti
 * Coordina GridStack, ModulePalette, EntitySelector e Document
 */
class DocumentBuilder {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enablePalette: true,
            enableEntitySelector: true,
            enableAutoSave: true,
            autoSaveInterval: 30000,
            ...options
        };
        
        // Componenti
        this.document = null;
        this.modulePalette = null;
        this.entitySelector = null;
        this.gridAdapter = null;
        
        // Riferimenti DOM
        this.paletteContainer = null;
        this.documentContainer = null;
        this.toolbarContainer = null;
        
        // Stato
        this.isInitialized = false;
        this.currentDocument = null;
        this.draggedModule = null;
        
        // Servizi
        this.eventBus = window.eventBus;
        this.storageManager = window.storageManager;
        this.moduleCompiler = window.moduleCompiler;
        
        this.init();
    }

    /**
     * Inizializza il Document Builder
     */
    async init() {
        try {
            this.setupContainer();
            this.setupComponents();
            this.setupEventListeners();
            this.setupDragAndDrop();
            
            // Crea un documento di default
            await this.createNewDocument();
            
            this.isInitialized = true;
            console.log('DocumentBuilder initialized successfully');
            
            this.eventBus?.emit('document-builder:initialized', { builder: this });
            
        } catch (error) {
            console.error('Failed to initialize DocumentBuilder:', error);
            throw error;
        }
    }

    /**
     * Setup del container principale
     */
    setupContainer() {
        if (!this.container) {
            throw new Error('Container element required');
        }

        this.container.className = 'document-builder';
        this.container.innerHTML = `
            <div class="builder-toolbar">
                <div class="toolbar-left">
                    <button class="btn-new-document" title="Nuovo Documento">📄 Nuovo</button>
                    <button class="btn-open-document" title="Apri Documento">📂 Apri</button>
                    <button class="btn-save-document" title="Salva Documento">💾 Salva</button>
                    <span class="toolbar-separator">|</span>
                    <button class="btn-export-document" title="Esporta Documento">📤 Esporta</button>
                </div>
                <div class="toolbar-center">
                    <span class="document-title-display">Nuovo Documento</span>
                </div>
                <div class="toolbar-right">
                    <button class="btn-toggle-palette" title="Mostra/Nascondi Palette">🎨 Palette</button>
                    <button class="btn-preview-mode" title="Modalità Anteprima">👁️ Anteprima</button>
                    <button class="btn-settings" title="Impostazioni">⚙️</button>
                </div>
            </div>
            <div class="builder-content">
                <div class="builder-sidebar">
                    <div class="module-palette-container"></div>
                </div>
                <div class="builder-main">
                    <div class="document-container"></div>
                </div>
            </div>
            <div class="builder-status">
                <div class="status-left">
                    <span class="status-message">Pronto</span>
                </div>
                <div class="status-right">
                    <span class="module-count">0 moduli</span>
                    <span class="save-status">Non salvato</span>
                </div>
            </div>
        `;

        // Riferimenti ai container
        this.toolbarContainer = this.container.querySelector('.builder-toolbar');
        this.paletteContainer = this.container.querySelector('.module-palette-container');
        this.documentContainer = this.container.querySelector('.document-container');
        
        this.setupToolbarEvents();
    }

    /**
     * Setup eventi della toolbar
     */
    setupToolbarEvents() {
        if (!this.toolbarContainer) return;

        // Document actions
        const newBtn = this.toolbarContainer.querySelector('.btn-new-document');
        const openBtn = this.toolbarContainer.querySelector('.btn-open-document');
        const saveBtn = this.toolbarContainer.querySelector('.btn-save-document');
        const exportBtn = this.toolbarContainer.querySelector('.btn-export-document');

        if (newBtn) newBtn.addEventListener('click', () => this.createNewDocument());
        if (openBtn) openBtn.addEventListener('click', () => this.openDocument());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveDocument());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportDocument());

        // View actions
        const togglePaletteBtn = this.toolbarContainer.querySelector('.btn-toggle-palette');
        const previewBtn = this.toolbarContainer.querySelector('.btn-preview-mode');
        const settingsBtn = this.toolbarContainer.querySelector('.btn-settings');

        if (togglePaletteBtn) togglePaletteBtn.addEventListener('click', () => this.togglePalette());
        if (previewBtn) previewBtn.addEventListener('click', () => this.togglePreviewMode());
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.openSettings());
    }

    /**
     * Setup dei componenti
     */
    setupComponents() {
        // Module Palette
        if (this.options.enablePalette && this.paletteContainer) {
            this.modulePalette = new ModulePalette(this.paletteContainer, {
                collapsible: true,
                searchable: true,
                categories: true
            });
        }

        // Entity Selector
        if (this.options.enableEntitySelector) {
            this.entitySelector = new EntitySelector({
                allowCreate: true,
                allowMultiple: false,
                showPreview: true
            });
        }
    }

    /**
     * Setup event listeners globali
     */
    setupEventListeners() {
        if (!this.eventBus) return;

        // Document events
        this.eventBus.on('document:title-changed', (data) => {
            this.updateDocumentTitle(data.title);
        });

        this.eventBus.on('document:saved', () => {
            this.updateSaveStatus('Salvato');
        });

        this.eventBus.on('gridstack:layout-changed', () => {
            this.updateSaveStatus('Non salvato');
        });

        this.eventBus.on('gridstack:module-added', (data) => {
            this.updateModuleCount();
            this.updateSaveStatus('Non salvato');
        });

        this.eventBus.on('gridstack:module-removed', (data) => {
            this.updateModuleCount();
            this.updateSaveStatus('Non salvato');
        });

        // Module drag events
        this.eventBus.on('module:drag-start', (data) => {
            this.handleModuleDragStart(data);
        });

        this.eventBus.on('module:drag-end', (data) => {
            this.handleModuleDragEnd(data);
        });
    }

    /**
     * Setup drag and drop per i moduli
     */
    setupDragAndDrop() {
        if (!this.documentContainer) return;

        // Drop zone per la griglia
        this.documentContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.documentContainer.classList.add('drag-over');
        });

        this.documentContainer.addEventListener('dragleave', (e) => {
            if (!this.documentContainer.contains(e.relatedTarget)) {
                this.documentContainer.classList.remove('drag-over');
            }
        });

        this.documentContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            this.documentContainer.classList.remove('drag-over');
            this.handleModuleDrop(e);
        });
    }

    /**
     * Gestisce l'inizio del drag di un modulo
     */
    handleModuleDragStart(data) {
        this.draggedModule = data.module;
        this.setStatus('Trascina il modulo nella griglia per aggiungerlo');
        
        // Evidenzia le zone di drop
        this.documentContainer?.classList.add('drop-zone-active');
    }

    /**
     * Gestisce la fine del drag di un modulo
     */
    handleModuleDragEnd(data) {
        this.draggedModule = null;
        this.setStatus('Pronto');
        
        // Rimuove evidenziazione
        this.documentContainer?.classList.remove('drop-zone-active', 'drag-over');
    }

    /**
     * Gestisce il drop di un modulo nella griglia
     */
    async handleModuleDrop(event) {
        try {
            const data = event.dataTransfer.getData('application/json');
            if (!data) return;

            const dropData = JSON.parse(data);
            if (dropData.type !== 'module' || !dropData.module) return;

            this.setStatus('Seleziona entità per il modulo...');
            
            // Apre il selettore di entità
            this.selectEntityForModule(dropData.module, (entity) => {
                if (entity) {
                    this.addModuleToDocument(dropData.module, entity, {
                        // Calcola posizione dal drop
                        autoPosition: true
                    });
                }
            });
            
        } catch (error) {
            console.error('Error handling module drop:', error);
            this.setStatus('Errore nell\'aggiunta del modulo');
        }
    }

    /**
     * Seleziona un'entità per un modulo
     */
    selectEntityForModule(moduleDefinition, callback) {
        if (!this.entitySelector) {
            console.error('EntitySelector not available');
            return;
        }

        // Determina il tipo di entità richiesto dal modulo
        const requiredEntityType = this.getRequiredEntityType(moduleDefinition);
        
        this.entitySelector.open(callback, {
            filterByType: requiredEntityType,
            allowCreate: true
        });
    }

    /**
     * Determina il tipo di entità richiesto da un modulo
     */
    getRequiredEntityType(moduleDefinition) {
        if (!moduleDefinition.slots) return null;

        // Analizza i path degli slot per determinare il tipo
        for (const slot of Object.values(moduleDefinition.slots)) {
            if (slot.path && slot.path.includes('.')) {
                const entityType = slot.path.split('.')[0];
                return entityType;
            }
        }

        return null;
    }

    /**
     * Aggiunge un modulo al documento
     */
    async addModuleToDocument(moduleDefinition, entity, gridOptions = {}) {
        if (!this.currentDocument) {
            console.error('No active document');
            return;
        }

        try {
            this.setStatus('Aggiunta modulo in corso...');
            
            const moduleInstance = await this.currentDocument.addModule(
                moduleDefinition, 
                entity, 
                gridOptions
            );
            
            this.setStatus('Modulo aggiunto con successo');
            
            console.log(`Module ${moduleDefinition.moduleId} added to document`);
            
            return moduleInstance;
            
        } catch (error) {
            console.error('Failed to add module to document:', error);
            this.setStatus('Errore nell\'aggiunta del modulo');
        }
    }

    /**
     * Crea un nuovo documento
     */
    async createNewDocument() {
        try {
            this.setStatus('Creazione nuovo documento...');
            
            // Distrugge il documento corrente se esiste
            if (this.currentDocument) {
                this.currentDocument.destroy();
            }
            
            // Crea nuovo documento
            const documentId = `doc-${Date.now()}`;
            this.currentDocument = new Document(documentId, 'Nuovo Documento');
            
            // Inizializza nel container
            await this.currentDocument.init(this.documentContainer);
            
            // Aggiorna UI
            this.updateDocumentTitle('Nuovo Documento');
            this.updateSaveStatus('Non salvato');
            this.updateModuleCount();
            
            this.setStatus('Nuovo documento creato');
            
            console.log(`New document created: ${documentId}`);
            this.eventBus?.emit('document-builder:document-created', { 
                builder: this, 
                document: this.currentDocument 
            });
            
        } catch (error) {
            console.error('Failed to create new document:', error);
            this.setStatus('Errore nella creazione del documento');
        }
    }

    /**
     * Apre un documento esistente
     */
    async openDocument() {
        try {
            // Implementazione semplificata - lista documenti salvati
            if (!this.storageManager) {
                alert('StorageManager non disponibile');
                return;
            }

            const documents = await this.storageManager.query({ key: /^document:/ });
            
            if (documents.length === 0) {
                alert('Nessun documento salvato trovato');
                return;
            }

            // Mostra lista documenti (implementazione semplificata)
            const documentList = documents.map((doc, index) => 
                `${index + 1}. ${doc.value.title} (${doc.value.id})`
            ).join('\n');
            
            const selection = prompt(`Seleziona documento da aprire:\n\n${documentList}\n\nInserisci il numero:`);
            
            if (!selection) return;
            
            const index = parseInt(selection) - 1;
            if (index < 0 || index >= documents.length) {
                alert('Selezione non valida');
                return;
            }

            const documentData = documents[index].value;
            await this.loadDocument(documentData.id);
            
        } catch (error) {
            console.error('Failed to open document:', error);
            this.setStatus('Errore nell\'apertura del documento');
        }
    }

    /**
     * Carica un documento specifico
     */
    async loadDocument(documentId) {
        try {
            this.setStatus('Caricamento documento...');
            
            // Distrugge il documento corrente
            if (this.currentDocument) {
                this.currentDocument.destroy();
            }
            
            // Crea e carica il documento
            this.currentDocument = new Document(documentId);
            await this.currentDocument.init(this.documentContainer);
            await this.currentDocument.load();
            
            // Aggiorna UI
            this.updateDocumentTitle(this.currentDocument.title);
            this.updateSaveStatus('Salvato');
            this.updateModuleCount();
            
            this.setStatus('Documento caricato');
            
            console.log(`Document loaded: ${documentId}`);
            this.eventBus?.emit('document-builder:document-loaded', { 
                builder: this, 
                document: this.currentDocument 
            });
            
        } catch (error) {
            console.error('Failed to load document:', error);
            this.setStatus('Errore nel caricamento del documento');
        }
    }

    /**
     * Salva il documento corrente
     */
    async saveDocument() {
        if (!this.currentDocument) {
            console.warn('No active document to save');
            return;
        }

        try {
            this.setStatus('Salvataggio in corso...');
            
            const success = await this.currentDocument.save();
            
            if (success) {
                this.updateSaveStatus('Salvato');
                this.setStatus('Documento salvato');
            } else {
                this.setStatus('Errore nel salvataggio');
            }
            
        } catch (error) {
            console.error('Failed to save document:', error);
            this.setStatus('Errore nel salvataggio');
        }
    }

    /**
     * Esporta il documento corrente
     */
    async exportDocument() {
        if (!this.currentDocument) {
            console.warn('No active document to export');
            return;
        }

        try {
            this.setStatus('Esportazione in corso...');
            
            await this.currentDocument.export('json');
            
            this.setStatus('Documento esportato');
            
        } catch (error) {
            console.error('Failed to export document:', error);
            this.setStatus('Errore nell\'esportazione');
        }
    }

    /**
     * Toggle della palette dei moduli
     */
    togglePalette() {
        const sidebar = this.container?.querySelector('.builder-sidebar');
        if (!sidebar) return;

        const isHidden = sidebar.style.display === 'none';
        
        if (isHidden) {
            sidebar.style.display = '';
            this.setStatus('Palette mostrata');
        } else {
            sidebar.style.display = 'none';
            this.setStatus('Palette nascosta');
        }
    }

    /**
     * Toggle modalità anteprima
     */
    togglePreviewMode() {
        const isPreview = this.container?.classList.contains('preview-mode');
        
        if (isPreview) {
            this.container.classList.remove('preview-mode');
            this.currentDocument?.gridAdapter?.setEditMode(true);
            this.setStatus('Modalità modifica attivata');
        } else {
            this.container.classList.add('preview-mode');
            this.currentDocument?.gridAdapter?.setEditMode(false);
            this.setStatus('Modalità anteprima attivata');
        }
    }

    /**
     * Apre le impostazioni
     */
    openSettings() {
        // Implementazione semplificata
        const settings = {
            autoSave: this.options.enableAutoSave,
            autoSaveInterval: this.options.autoSaveInterval / 1000
        };

        const newAutoSave = confirm(`Auto-salvataggio attualmente: ${settings.autoSave ? 'ATTIVO' : 'DISATTIVO'}\n\nVuoi cambiare?`);
        
        if (newAutoSave !== null) {
            this.options.enableAutoSave = newAutoSave;
            
            if (this.currentDocument) {
                this.currentDocument.autoSave = newAutoSave;
                
                if (newAutoSave) {
                    this.currentDocument.startAutoSave();
                } else {
                    this.currentDocument.stopAutoSave();
                }
            }
            
            this.setStatus(`Auto-salvataggio ${newAutoSave ? 'attivato' : 'disattivato'}`);
        }
    }

    /**
     * Aggiorna il titolo del documento nella UI
     */
    updateDocumentTitle(title) {
        const titleDisplay = this.container?.querySelector('.document-title-display');
        if (titleDisplay) {
            titleDisplay.textContent = title;
        }
    }

    /**
     * Aggiorna lo status di salvataggio
     */
    updateSaveStatus(status) {
        const saveStatus = this.container?.querySelector('.save-status');
        if (saveStatus) {
            saveStatus.textContent = status;
            saveStatus.className = `save-status ${status === 'Salvato' ? 'saved' : 'unsaved'}`;
        }
    }

    /**
     * Aggiorna il conteggio dei moduli
     */
    updateModuleCount() {
        const moduleCount = this.container?.querySelector('.module-count');
        if (moduleCount && this.currentDocument) {
            const count = this.currentDocument.modules.size;
            moduleCount.textContent = `${count} moduli`;
        }
    }

    /**
     * Imposta il messaggio di status
     */
    setStatus(message) {
        const statusMessage = this.container?.querySelector('.status-message');
        if (statusMessage) {
            statusMessage.textContent = message;
        }
        
        // Auto-clear dopo 5 secondi
        setTimeout(() => {
            if (statusMessage && statusMessage.textContent === message) {
                statusMessage.textContent = 'Pronto';
            }
        }, 5000);
    }

    /**
     * Ottiene il documento corrente
     */
    getCurrentDocument() {
        return this.currentDocument;
    }

    /**
     * Distrugge il Document Builder
     */
    destroy() {
        try {
            // Distrugge i componenti
            if (this.currentDocument) {
                this.currentDocument.destroy();
                this.currentDocument = null;
            }
            
            if (this.modulePalette) {
                this.modulePalette.destroy();
                this.modulePalette = null;
            }
            
            if (this.entitySelector) {
                this.entitySelector.destroy();
                this.entitySelector = null;
            }
            
            // Pulisce il container
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            console.log('DocumentBuilder destroyed');
            this.eventBus?.emit('document-builder:destroyed', { builder: this });
            
        } catch (error) {
            console.error('Failed to destroy DocumentBuilder:', error);
        }
    }
}

// Export per uso globale
window.DocumentBuilder = DocumentBuilder; 