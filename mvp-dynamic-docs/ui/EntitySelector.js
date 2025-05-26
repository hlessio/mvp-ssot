/**
 * EntitySelector - Selettore di entità per collegare moduli
 * Gestisce la selezione di entità esistenti o la creazione di nuove entità
 */
class EntitySelector {
    constructor(options = {}) {
        this.options = {
            allowCreate: true,
            allowMultiple: false,
            filterByType: null,
            showPreview: true,
            ...options
        };
        
        this.entities = new Map();
        this.filteredEntities = new Map();
        this.selectedEntities = new Set();
        this.searchTerm = '';
        this.selectedType = 'all';
        
        this.eventBus = window.eventBus;
        this.storageManager = window.storageManager;
        this.entityManager = window.EntityManager;
        
        this.modal = null;
        this.isOpen = false;
        this.currentCallback = null;
        
        this.init();
    }

    /**
     * Inizializza il selettore
     */
    init() {
        this.createModal();
        this.setupEventListeners();
        this.loadEntities();
        
        console.log('EntitySelector initialized');
    }

    /**
     * Crea il modal del selettore
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'entity-selector-modal';
        this.modal.style.display = 'none';
        
        this.modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Seleziona Entità</h3>
                    <button class="modal-close" title="Chiudi">✕</button>
                </div>
                <div class="modal-body">
                    <div class="selector-controls">
                        <div class="search-section">
                            <input type="text" class="entity-search" placeholder="Cerca entità...">
                            <button class="search-clear" title="Pulisci">✕</button>
                        </div>
                        <div class="filter-section">
                            <select class="type-filter">
                                <option value="all">Tutti i tipi</option>
                            </select>
                        </div>
                        ${this.options.allowCreate ? `
                            <div class="create-section">
                                <button class="btn-create-entity">+ Crea Nuova Entità</button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="entities-list"></div>
                    ${this.options.showPreview ? `
                        <div class="entity-preview">
                            <h4>Anteprima</h4>
                            <div class="preview-content">
                                <p>Seleziona un'entità per vedere l'anteprima</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel">Annulla</button>
                    <button class="btn-confirm" disabled>Conferma</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupModalEvents();
    }

    /**
     * Setup eventi del modal
     */
    setupModalEvents() {
        if (!this.modal) return;

        // Close modal
        const closeBtn = this.modal.querySelector('.modal-close');
        const backdrop = this.modal.querySelector('.modal-backdrop');
        const cancelBtn = this.modal.querySelector('.btn-cancel');
        
        [closeBtn, backdrop, cancelBtn].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.close());
            }
        });

        // Search
        const searchInput = this.modal.querySelector('.entity-search');
        const searchClear = this.modal.querySelector('.search-clear');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setSearchTerm(e.target.value);
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.setSearchTerm('');
                }
            });
        }

        // Type filter
        const typeFilter = this.modal.querySelector('.type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.setTypeFilter(e.target.value);
            });
        }

        // Create entity
        const createBtn = this.modal.querySelector('.btn-create-entity');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showCreateEntityForm();
            });
        }

        // Confirm selection
        const confirmBtn = this.modal.querySelector('.btn-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmSelection();
            });
        }

        // Prevent modal close on content click
        const modalContent = this.modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Setup event listeners globali
     */
    setupEventListeners() {
        if (!this.eventBus) return;

        // Entity changes
        this.eventBus.on('entity:created', (data) => {
            if (data.entity) {
                this.addEntity(data.entity);
            }
        });

        this.eventBus.on('entity:updated', (data) => {
            if (data.entity) {
                this.updateEntity(data.entity);
            }
        });

        this.eventBus.on('entity:deleted', (data) => {
            if (data.entityId) {
                this.removeEntity(data.entityId);
            }
        });
    }

    /**
     * Carica le entità disponibili
     */
    async loadEntities() {
        try {
            if (this.entityManager) {
                const entities = await this.entityManager.getAllEntities();
                entities.forEach(entity => this.addEntity(entity));
            } else if (this.storageManager) {
                // Carica direttamente dal storage se EntityManager non è disponibile
                const data = await this.storageManager.query({ key: /^entity:/ });
                data.forEach(item => {
                    if (item.value && item.value.id) {
                        this.addEntity(item.value);
                    }
                });
            }
            
            this.updateTypeFilter();
            this.applyFilters();
            this.render();
            
        } catch (error) {
            console.error('Failed to load entities:', error);
        }
    }

    /**
     * Aggiunge un'entità alla lista
     */
    addEntity(entity) {
        if (!entity || !entity.id) return;
        
        this.entities.set(entity.id, entity);
        this.updateTypeFilter();
        this.applyFilters();
        
        if (this.isOpen) {
            this.render();
        }
    }

    /**
     * Aggiorna un'entità nella lista
     */
    updateEntity(entity) {
        if (!entity || !entity.id) return;
        
        if (this.entities.has(entity.id)) {
            this.entities.set(entity.id, entity);
            this.applyFilters();
            
            if (this.isOpen) {
                this.render();
                this.updatePreview();
            }
        }
    }

    /**
     * Rimuove un'entità dalla lista
     */
    removeEntity(entityId) {
        this.entities.delete(entityId);
        this.selectedEntities.delete(entityId);
        this.updateTypeFilter();
        this.applyFilters();
        
        if (this.isOpen) {
            this.render();
            this.updatePreview();
            this.updateConfirmButton();
        }
    }

    /**
     * Apre il selettore
     */
    open(callback, options = {}) {
        if (this.isOpen) return;

        this.currentCallback = callback;
        this.options = { ...this.options, ...options };
        
        // Reset state
        this.selectedEntities.clear();
        this.searchTerm = '';
        this.selectedType = this.options.filterByType || 'all';
        
        // Update UI
        this.updateTypeFilter();
        this.applyFilters();
        this.render();
        this.updatePreview();
        this.updateConfirmButton();
        
        // Show modal
        this.modal.style.display = 'flex';
        this.isOpen = true;
        
        // Focus search
        const searchInput = this.modal.querySelector('.entity-search');
        if (searchInput) {
            searchInput.focus();
        }
        
        console.log('EntitySelector opened');
        this.eventBus?.emit('entity-selector:opened', { selector: this });
    }

    /**
     * Chiude il selettore
     */
    close() {
        if (!this.isOpen) return;

        this.modal.style.display = 'none';
        this.isOpen = false;
        this.currentCallback = null;
        
        console.log('EntitySelector closed');
        this.eventBus?.emit('entity-selector:closed', { selector: this });
    }

    /**
     * Conferma la selezione
     */
    confirmSelection() {
        if (!this.currentCallback) return;

        const selectedEntities = Array.from(this.selectedEntities)
            .map(id => this.entities.get(id))
            .filter(entity => entity);

        if (selectedEntities.length === 0) return;

        try {
            if (this.options.allowMultiple) {
                this.currentCallback(selectedEntities);
            } else {
                this.currentCallback(selectedEntities[0]);
            }
            
            this.close();
            
        } catch (error) {
            console.error('Error in selection callback:', error);
        }
    }

    /**
     * Imposta il termine di ricerca
     */
    setSearchTerm(term) {
        this.searchTerm = term.toLowerCase().trim();
        this.applyFilters();
        this.render();
    }

    /**
     * Imposta il filtro per tipo
     */
    setTypeFilter(type) {
        this.selectedType = type;
        this.applyFilters();
        this.render();
    }

    /**
     * Applica i filtri alle entità
     */
    applyFilters() {
        this.filteredEntities.clear();
        
        for (const [entityId, entity] of this.entities.entries()) {
            let include = true;
            
            // Filtro per tipo
            if (this.selectedType !== 'all' && entity.type !== this.selectedType) {
                include = false;
            }
            
            // Filtro opzioni
            if (include && this.options.filterByType && entity.type !== this.options.filterByType) {
                include = false;
            }
            
            // Filtro ricerca
            if (include && this.searchTerm) {
                const searchableText = [
                    entity.id || '',
                    entity.type || '',
                    ...Object.values(entity.attributes || {}).map(attr => 
                        typeof attr.value === 'string' ? attr.value : ''
                    )
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(this.searchTerm)) {
                    include = false;
                }
            }
            
            if (include) {
                this.filteredEntities.set(entityId, entity);
            }
        }
    }

    /**
     * Aggiorna il filtro dei tipi
     */
    updateTypeFilter() {
        const typeFilter = this.modal?.querySelector('.type-filter');
        if (!typeFilter) return;

        const currentValue = typeFilter.value;
        
        // Ottiene tutti i tipi disponibili
        const types = new Set();
        for (const entity of this.entities.values()) {
            if (entity.type) {
                types.add(entity.type);
            }
        }
        
        // Aggiorna le opzioni
        typeFilter.innerHTML = '<option value="all">Tutti i tipi</option>';
        Array.from(types).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeFilter.appendChild(option);
        });
        
        // Ripristina la selezione
        if (Array.from(typeFilter.options).some(opt => opt.value === currentValue)) {
            typeFilter.value = currentValue;
        }
    }

    /**
     * Renderizza la lista delle entità
     */
    render() {
        const entitiesList = this.modal?.querySelector('.entities-list');
        if (!entitiesList) return;

        entitiesList.innerHTML = '';
        
        if (this.filteredEntities.size === 0) {
            entitiesList.innerHTML = `
                <div class="no-entities">
                    <p>Nessuna entità trovata</p>
                    ${this.options.allowCreate ? `
                        <button class="btn-create-inline">Crea nuova entità</button>
                    ` : ''}
                </div>
            `;
            
            const createInlineBtn = entitiesList.querySelector('.btn-create-inline');
            if (createInlineBtn) {
                createInlineBtn.addEventListener('click', () => {
                    this.showCreateEntityForm();
                });
            }
            
            return;
        }

        // Raggruppa per tipo
        const entitiesByType = new Map();
        for (const [entityId, entity] of this.filteredEntities.entries()) {
            const type = entity.type || 'Unknown';
            if (!entitiesByType.has(type)) {
                entitiesByType.set(type, []);
            }
            entitiesByType.get(type).push(entity);
        }

        // Renderizza ogni tipo
        const sortedTypes = Array.from(entitiesByType.keys()).sort();
        sortedTypes.forEach(type => {
            const entities = entitiesByType.get(type);
            
            const typeSection = document.createElement('div');
            typeSection.className = 'entity-type-section';
            typeSection.innerHTML = `
                <h4 class="type-title">${type} (${entities.length})</h4>
                <div class="type-entities"></div>
            `;
            
            const typeContainer = typeSection.querySelector('.type-entities');
            entities.forEach(entity => {
                const entityElement = this.createEntityElement(entity);
                typeContainer.appendChild(entityElement);
            });
            
            entitiesList.appendChild(typeSection);
        });
    }

    /**
     * Crea l'elemento per un'entità
     */
    createEntityElement(entity) {
        const element = document.createElement('div');
        element.className = 'entity-item';
        element.dataset.entityId = entity.id;
        
        if (this.selectedEntities.has(entity.id)) {
            element.classList.add('selected');
        }
        
        // Ottiene alcuni attributi chiave per la visualizzazione
        const displayAttributes = this.getDisplayAttributes(entity);
        
        element.innerHTML = `
            <div class="entity-info">
                <div class="entity-id">${entity.id}</div>
                <div class="entity-attributes">
                    ${displayAttributes.map(attr => 
                        `<span class="attribute">${attr.name}: ${attr.value}</span>`
                    ).join('')}
                </div>
                <div class="entity-meta">
                    <span class="entity-type">${entity.type}</span>
                    <span class="entity-date">${new Date(entity.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="entity-actions">
                <button class="btn-preview" title="Anteprima">👁️</button>
            </div>
        `;

        this.setupEntityEvents(element, entity);
        
        return element;
    }

    /**
     * Setup eventi per un elemento entità
     */
    setupEntityEvents(element, entity) {
        // Click per selezione
        element.addEventListener('click', (e) => {
            if (e.target.closest('.entity-actions')) return;
            
            this.toggleEntitySelection(entity.id);
        });

        // Preview button
        const previewBtn = element.querySelector('.btn-preview');
        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEntityPreview(entity);
            });
        }
    }

    /**
     * Toggle selezione entità
     */
    toggleEntitySelection(entityId) {
        if (this.selectedEntities.has(entityId)) {
            this.selectedEntities.delete(entityId);
        } else {
            if (!this.options.allowMultiple) {
                this.selectedEntities.clear();
            }
            this.selectedEntities.add(entityId);
        }
        
        this.updateSelectionUI();
        this.updatePreview();
        this.updateConfirmButton();
    }

    /**
     * Aggiorna l'UI della selezione
     */
    updateSelectionUI() {
        const entityItems = this.modal?.querySelectorAll('.entity-item');
        if (!entityItems) return;

        entityItems.forEach(item => {
            const entityId = item.dataset.entityId;
            if (this.selectedEntities.has(entityId)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * Aggiorna il pulsante di conferma
     */
    updateConfirmButton() {
        const confirmBtn = this.modal?.querySelector('.btn-confirm');
        if (!confirmBtn) return;

        const hasSelection = this.selectedEntities.size > 0;
        confirmBtn.disabled = !hasSelection;
        confirmBtn.textContent = hasSelection 
            ? `Conferma (${this.selectedEntities.size})`
            : 'Conferma';
    }

    /**
     * Mostra l'anteprima dell'entità
     */
    showEntityPreview(entity) {
        if (!this.options.showPreview) return;

        const previewContent = this.modal?.querySelector('.preview-content');
        if (!previewContent) return;

        const attributes = Object.entries(entity.attributes || {})
            .map(([name, attr]) => `
                <div class="preview-attribute">
                    <strong>${name}:</strong> 
                    <span class="value">${this.formatAttributeValue(attr.value)}</span>
                    <span class="type">(${attr.type})</span>
                </div>
            `).join('');

        previewContent.innerHTML = `
            <div class="preview-header">
                <h5>${entity.id}</h5>
                <span class="preview-type">${entity.type}</span>
            </div>
            <div class="preview-attributes">
                ${attributes || '<p>Nessun attributo</p>'}
            </div>
            <div class="preview-meta">
                <small>Creato: ${new Date(entity.createdAt).toLocaleString()}</small>
            </div>
        `;
    }

    /**
     * Aggiorna l'anteprima con l'entità selezionata
     */
    updatePreview() {
        if (!this.options.showPreview) return;

        if (this.selectedEntities.size === 1) {
            const entityId = Array.from(this.selectedEntities)[0];
            const entity = this.entities.get(entityId);
            if (entity) {
                this.showEntityPreview(entity);
            }
        } else {
            const previewContent = this.modal?.querySelector('.preview-content');
            if (previewContent) {
                if (this.selectedEntities.size === 0) {
                    previewContent.innerHTML = '<p>Seleziona un\'entità per vedere l\'anteprima</p>';
                } else {
                    previewContent.innerHTML = `<p>${this.selectedEntities.size} entità selezionate</p>`;
                }
            }
        }
    }

    /**
     * Ottiene gli attributi da visualizzare per un'entità
     */
    getDisplayAttributes(entity) {
        const attributes = entity.attributes || {};
        const displayAttrs = [];
        
        // Priorità per attributi comuni
        const priorityAttrs = ['nome', 'name', 'title', 'email', 'telefono', 'phone'];
        
        for (const attrName of priorityAttrs) {
            if (attributes[attrName]) {
                displayAttrs.push({
                    name: attrName,
                    value: this.formatAttributeValue(attributes[attrName].value)
                });
                if (displayAttrs.length >= 3) break;
            }
        }
        
        // Aggiunge altri attributi se necessario
        if (displayAttrs.length < 3) {
            for (const [name, attr] of Object.entries(attributes)) {
                if (!priorityAttrs.includes(name) && displayAttrs.length < 3) {
                    displayAttrs.push({
                        name,
                        value: this.formatAttributeValue(attr.value)
                    });
                }
            }
        }
        
        return displayAttrs;
    }

    /**
     * Formatta il valore di un attributo per la visualizzazione
     */
    formatAttributeValue(value) {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'string') return value.length > 30 ? value.substring(0, 30) + '...' : value;
        if (typeof value === 'object') return JSON.stringify(value).substring(0, 30) + '...';
        return String(value);
    }

    /**
     * Mostra il form per creare una nuova entità
     */
    showCreateEntityForm() {
        // Implementazione semplificata - in futuro potrebbe essere un modal separato
        const entityType = prompt('Tipo di entità:', this.options.filterByType || 'Cliente');
        if (!entityType) return;

        const entityId = prompt('ID entità:', `${entityType.toLowerCase()}-${Date.now()}`);
        if (!entityId) return;

        try {
            // Crea l'entità
            const Entity = window.Entity;
            if (Entity) {
                const newEntity = new Entity(entityId, entityType);
                
                // Salva l'entità
                if (this.storageManager) {
                    this.storageManager.save(`entity:${entityId}`, newEntity.serialize());
                }
                
                // Aggiunge alla lista
                this.addEntity(newEntity);
                
                // Seleziona automaticamente
                this.selectedEntities.clear();
                this.selectedEntities.add(entityId);
                
                this.updateSelectionUI();
                this.updatePreview();
                this.updateConfirmButton();
                
                console.log(`New entity created: ${entityId}`);
                this.eventBus?.emit('entity:created', { entity: newEntity });
            }
            
        } catch (error) {
            console.error('Failed to create entity:', error);
            alert('Errore nella creazione dell\'entità');
        }
    }

    /**
     * Distrugge il selettore
     */
    destroy() {
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
        }
        
        this.entities.clear();
        this.filteredEntities.clear();
        this.selectedEntities.clear();
        
        console.log('EntitySelector destroyed');
    }
}

// Export per uso globale
window.EntitySelector = EntitySelector; 