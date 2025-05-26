/**
 * Document - Rappresenta un documento composto da moduli
 * Gestisce il ciclo di vita, il layout e la persistenza di un documento
 */
class Document {
    constructor(id, title = 'Nuovo Documento') {
        this.id = id || `doc-${Date.now()}`;
        this.title = title;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.version = '1.0.0';
        
        // Moduli nel documento
        this.modules = new Map(); // Map<moduleInstanceId, ModuleInstance>
        this.layout = []; // Layout GridStack
        
        // Configurazione
        this.config = {
            gridOptions: {
                cellHeight: 80,
                verticalMargin: 10,
                horizontalMargin: 10,
                animate: true,
                float: false
            },
            theme: 'default',
            responsive: true
        };

        // Riferimenti
        this.gridAdapter = null;
        this.container = null;
        this.eventBus = window.eventBus;
        this.storageManager = window.storageManager;
        
        // Stato
        this.isDirty = false;
        this.isLoading = false;
        this.autoSave = true;
        this.autoSaveInterval = 30000; // 30 secondi
        this.autoSaveTimer = null;

        this.setupEventListeners();
        this.startAutoSave();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.eventBus) return;

        // Layout changes
        this.eventBus.on('gridstack:layout-changed', (data) => {
            if (data.layout) {
                this.layout = data.layout;
                this.markDirty();
            }
        });

        // Module events
        this.eventBus.on('gridstack:module-added', (data) => {
            if (data.moduleInstance) {
                this.modules.set(data.moduleInstance.id, data.moduleInstance);
                this.markDirty();
            }
        });

        this.eventBus.on('gridstack:module-removed', (data) => {
            if (data.moduleInstance) {
                this.modules.delete(data.moduleInstance.id);
                this.markDirty();
            }
        });

        // Entity changes
        this.eventBus.on('entity:attribute-changed', () => {
            this.markDirty();
        });
    }

    /**
     * Inizializza il documento in un container
     */
    async init(container) {
        if (!container) {
            throw new Error('Container element required');
        }

        try {
            this.container = container;
            this.setupContainer();
            
            // Inizializza GridStack adapter
            const gridContainer = container.querySelector('.document-grid');
            this.gridAdapter = new GridStackAdapter(gridContainer, this.config.gridOptions);
            
            // Setup event handlers
            this.setupGridEvents();
            
            console.log(`Document ${this.id} initialized`);
            this.eventBus?.emit('document:initialized', { document: this });
            
        } catch (error) {
            console.error('Failed to initialize document:', error);
            throw error;
        }
    }

    /**
     * Setup del container del documento
     */
    setupContainer() {
        if (!this.container) return;

        this.container.className = 'document-container';
        this.container.innerHTML = `
            <div class="document-header">
                <div class="document-title">
                    <h2 contenteditable="true">${this.title}</h2>
                    <span class="document-status"></span>
                </div>
                <div class="document-controls">
                    <button class="btn-save" title="Salva">💾</button>
                    <button class="btn-export" title="Esporta">📤</button>
                    <button class="btn-settings" title="Impostazioni">⚙️</button>
                </div>
            </div>
            <div class="document-grid grid-stack"></div>
            <div class="document-footer">
                <div class="document-info">
                    <span>Moduli: <span class="module-count">0</span></span>
                    <span>Ultimo salvataggio: <span class="last-saved">Mai</span></span>
                </div>
            </div>
        `;

        this.setupContainerEvents();
    }

    /**
     * Setup eventi del container
     */
    setupContainerEvents() {
        if (!this.container) return;

        // Title editing
        const titleElement = this.container.querySelector('.document-title h2');
        if (titleElement) {
            titleElement.addEventListener('blur', () => {
                const newTitle = titleElement.textContent.trim();
                if (newTitle && newTitle !== this.title) {
                    this.setTitle(newTitle);
                }
            });

            titleElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleElement.blur();
                }
            });
        }

        // Control buttons
        const saveBtn = this.container.querySelector('.btn-save');
        const exportBtn = this.container.querySelector('.btn-export');
        const settingsBtn = this.container.querySelector('.btn-settings');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.export());
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
    }

    /**
     * Setup eventi della griglia
     */
    setupGridEvents() {
        if (!this.gridAdapter) return;

        this.gridAdapter.on('onLayoutChange', (layout) => {
            this.updateModuleCount();
            this.updateStatus();
        });

        this.gridAdapter.on('onModuleAdd', (moduleInstance) => {
            this.updateModuleCount();
            this.updateStatus();
        });

        this.gridAdapter.on('onModuleRemove', (moduleInstance) => {
            this.updateModuleCount();
            this.updateStatus();
        });
    }

    /**
     * Aggiunge un modulo al documento
     */
    async addModule(moduleDefinition, entity, gridOptions = {}) {
        if (!this.gridAdapter) {
            throw new Error('Document not initialized');
        }

        try {
            // Compila il modulo
            const moduleCompiler = window.moduleCompiler;
            if (!moduleCompiler) {
                throw new Error('ModuleCompiler not available');
            }

            const compiledModule = await moduleCompiler.compile(moduleDefinition, entity);
            
            // Crea istanza del modulo
            const moduleInstance = {
                id: `${moduleDefinition.moduleId}-${Date.now()}`,
                moduleId: moduleDefinition.moduleId,
                entityId: entity.id,
                title: moduleDefinition.title || moduleDefinition.moduleId,
                compiledModule,
                entity,
                element: null,
                
                mount: (container) => {
                    if (compiledModule && compiledModule.html) {
                        container.innerHTML = compiledModule.html;
                        
                        // Applica CSS se presente
                        if (compiledModule.css) {
                            const style = document.createElement('style');
                            style.textContent = compiledModule.css;
                            container.appendChild(style);
                        }
                        
                        // Esegui JavaScript se presente
                        if (compiledModule.js) {
                            try {
                                const jsFunction = new Function('container', 'entity', 'eventBus', compiledModule.js);
                                jsFunction(container, entity, this.eventBus);
                            } catch (error) {
                                console.error('Error executing module JS:', error);
                            }
                        }
                        
                        moduleInstance.element = container;
                    }
                },
                
                unmount: () => {
                    if (moduleInstance.element) {
                        moduleInstance.element.innerHTML = '';
                        moduleInstance.element = null;
                    }
                }
            };

            // Aggiunge alla griglia
            const gridElement = this.gridAdapter.addModule(moduleInstance, gridOptions);
            
            console.log(`Module ${moduleInstance.id} added to document ${this.id}`);
            return moduleInstance;
            
        } catch (error) {
            console.error('Failed to add module to document:', error);
            throw error;
        }
    }

    /**
     * Rimuove un modulo dal documento
     */
    removeModule(moduleInstanceId) {
        const moduleInstance = this.modules.get(moduleInstanceId);
        if (moduleInstance && this.gridAdapter) {
            this.gridAdapter.removeModule(moduleInstance);
        }
    }

    /**
     * Imposta il titolo del documento
     */
    setTitle(title) {
        this.title = title;
        this.markDirty();
        
        const titleElement = this.container?.querySelector('.document-title h2');
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        this.eventBus?.emit('document:title-changed', { document: this, title });
    }

    /**
     * Salva il documento
     */
    async save() {
        if (!this.storageManager) {
            console.warn('StorageManager not available, cannot save document');
            return false;
        }

        try {
            this.updateStatus('Salvataggio...');
            
            const documentData = this.serialize();
            await this.storageManager.save(`document:${this.id}`, documentData);
            
            this.isDirty = false;
            this.updatedAt = new Date();
            
            this.updateStatus('Salvato');
            this.updateLastSaved();
            
            console.log(`Document ${this.id} saved successfully`);
            this.eventBus?.emit('document:saved', { document: this });
            
            return true;
            
        } catch (error) {
            console.error('Failed to save document:', error);
            this.updateStatus('Errore salvataggio');
            return false;
        }
    }

    /**
     * Carica il documento
     */
    async load() {
        if (!this.storageManager) {
            throw new Error('StorageManager not available');
        }

        try {
            this.isLoading = true;
            this.updateStatus('Caricamento...');
            
            const documentData = await this.storageManager.load(`document:${this.id}`);
            if (documentData) {
                this.deserialize(documentData);
                
                // Ricarica i moduli se la griglia è inizializzata
                if (this.gridAdapter) {
                    await this.reloadModules();
                }
                
                this.isDirty = false;
                this.updateStatus('Caricato');
                
                console.log(`Document ${this.id} loaded successfully`);
                this.eventBus?.emit('document:loaded', { document: this });
            }
            
        } catch (error) {
            console.error('Failed to load document:', error);
            this.updateStatus('Errore caricamento');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Ricarica i moduli nel documento
     */
    async reloadModules() {
        if (!this.gridAdapter) return;

        try {
            // Pulisce la griglia corrente
            this.gridAdapter.clear();
            
            // Ricarica ogni modulo
            const moduleInstances = [];
            for (const moduleData of this.modules.values()) {
                // Qui dovremmo ricaricare il modulo dai dati salvati
                // Per ora saltiamo questa parte complessa
                console.log('Module reload not fully implemented:', moduleData);
            }
            
            // Carica il layout
            if (this.layout.length > 0) {
                this.gridAdapter.loadLayout(this.layout, moduleInstances);
            }
            
        } catch (error) {
            console.error('Failed to reload modules:', error);
        }
    }

    /**
     * Esporta il documento
     */
    async export(format = 'json') {
        try {
            const documentData = this.serialize();
            
            if (format === 'json') {
                const blob = new Blob([JSON.stringify(documentData, null, 2)], {
                    type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.title || this.id}.json`;
                a.click();
                
                URL.revokeObjectURL(url);
            }
            
            this.eventBus?.emit('document:exported', { document: this, format });
            
        } catch (error) {
            console.error('Failed to export document:', error);
        }
    }

    /**
     * Serializza il documento per il salvataggio
     */
    serialize() {
        return {
            id: this.id,
            title: this.title,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            version: this.version,
            config: this.config,
            layout: this.layout,
            modules: Array.from(this.modules.entries()).map(([id, module]) => ({
                id,
                moduleId: module.moduleId,
                entityId: module.entityId,
                title: module.title
            }))
        };
    }

    /**
     * Deserializza i dati del documento
     */
    deserialize(data) {
        this.id = data.id;
        this.title = data.title;
        this.createdAt = new Date(data.createdAt);
        this.updatedAt = new Date(data.updatedAt);
        this.version = data.version || '1.0.0';
        this.config = { ...this.config, ...data.config };
        this.layout = data.layout || [];
        
        // Ricostruisce la mappa dei moduli
        this.modules.clear();
        if (data.modules) {
            data.modules.forEach(moduleData => {
                this.modules.set(moduleData.id, moduleData);
            });
        }
    }

    /**
     * Marca il documento come modificato
     */
    markDirty() {
        this.isDirty = true;
        this.updateStatus();
    }

    /**
     * Aggiorna lo status del documento
     */
    updateStatus(status = null) {
        const statusElement = this.container?.querySelector('.document-status');
        if (!statusElement) return;

        if (status) {
            statusElement.textContent = status;
            statusElement.className = 'document-status';
        } else if (this.isDirty) {
            statusElement.textContent = 'Non salvato';
            statusElement.className = 'document-status dirty';
        } else {
            statusElement.textContent = 'Salvato';
            statusElement.className = 'document-status saved';
        }
    }

    /**
     * Aggiorna il conteggio dei moduli
     */
    updateModuleCount() {
        const countElement = this.container?.querySelector('.module-count');
        if (countElement) {
            countElement.textContent = this.modules.size;
        }
    }

    /**
     * Aggiorna l'ultimo salvataggio
     */
    updateLastSaved() {
        const lastSavedElement = this.container?.querySelector('.last-saved');
        if (lastSavedElement) {
            lastSavedElement.textContent = this.updatedAt.toLocaleTimeString();
        }
    }

    /**
     * Apre le impostazioni del documento
     */
    openSettings() {
        this.eventBus?.emit('document:settings-requested', { document: this });
    }

    /**
     * Avvia l'auto-salvataggio
     */
    startAutoSave() {
        if (this.autoSave && this.autoSaveInterval > 0) {
            this.autoSaveTimer = setInterval(() => {
                if (this.isDirty) {
                    this.save();
                }
            }, this.autoSaveInterval);
        }
    }

    /**
     * Ferma l'auto-salvataggio
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    /**
     * Distrugge il documento
     */
    destroy() {
        try {
            this.stopAutoSave();
            
            if (this.gridAdapter) {
                this.gridAdapter.destroy();
                this.gridAdapter = null;
            }
            
            this.modules.clear();
            this.layout = [];
            
            if (this.container) {
                this.container.innerHTML = '';
                this.container = null;
            }
            
            console.log(`Document ${this.id} destroyed`);
            this.eventBus?.emit('document:destroyed', { document: this });
            
        } catch (error) {
            console.error('Failed to destroy document:', error);
        }
    }
}

// Export per uso globale
window.Document = Document;