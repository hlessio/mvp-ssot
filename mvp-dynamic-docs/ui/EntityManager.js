/**
 * EntityManager - Componente per visualizzazione e gestione entità
 * Mostra tutte le entità con i loro attributi in tempo reale
 * Permette editing diretto degli attributi con propagazione automatica
 */
class EntityManager {
    constructor(container, attributeSpace, eventBus) {
        this.container = container;
        this.attributeSpace = attributeSpace;
        this.eventBus = eventBus;
        this.entities = new Map();
        this.isVisible = false;
        
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        this.createUI();
        this.loadExistingEntities();
    }
    
    createUI() {
        this.container.innerHTML = `
            <div class="entity-manager">
                <div class="entity-manager-header">
                    <h3>🏢 Entity Manager</h3>
                    <div class="entity-manager-controls">
                        <button class="btn-refresh" title="Aggiorna">🔄</button>
                        <button class="btn-add-entity" title="Nuova Entità">➕</button>
                        <button class="btn-toggle" title="Nascondi/Mostra">👁️</button>
                    </div>
                </div>
                <div class="entity-manager-content">
                    <div class="entity-stats">
                        <span class="stat-item">Entità: <span id="entityCount">0</span></span>
                        <span class="stat-item">Attributi: <span id="attributeCount">0</span></span>
                    </div>
                    <div class="entity-search">
                        <input type="text" placeholder="🔍 Cerca entità..." id="entitySearchInput">
                    </div>
                    <div class="entity-list" id="entityList">
                        <div class="empty-state">
                            <p>Nessuna entità trovata</p>
                            <p class="empty-hint">Crea una nuova entità o aggiungi moduli al documento</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
        this.bindUIEvents();
    }
    
    addStyles() {
        if (document.getElementById('entity-manager-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'entity-manager-styles';
        style.textContent = `
            .entity-manager {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-height: 600px;
                display: flex;
                flex-direction: column;
            }
            
            .entity-manager-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .entity-manager-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            .entity-manager-controls {
                display: flex;
                gap: 8px;
            }
            
            .entity-manager-controls button {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .entity-manager-controls button:hover {
                background: rgba(255,255,255,0.3);
            }
            
            .entity-manager-content {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .entity-stats {
                padding: 12px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                gap: 16px;
                font-size: 12px;
            }
            
            .stat-item {
                color: #6c757d;
                font-weight: 500;
            }
            
            .stat-item span {
                color: #495057;
                font-weight: 600;
            }
            
            .entity-search {
                padding: 12px 16px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .entity-search input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            }
            
            .entity-search input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25);
            }
            
            .entity-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }
            
            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
            }
            
            .empty-state p {
                margin: 8px 0;
            }
            
            .empty-hint {
                font-size: 12px;
                opacity: 0.8;
            }
            
            .entity-card {
                background: #fff;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                margin-bottom: 8px;
                overflow: hidden;
                transition: all 0.2s;
            }
            
            .entity-card:hover {
                border-color: #667eea;
                box-shadow: 0 2px 4px rgba(102, 126, 234, 0.1);
            }
            
            .entity-card-header {
                background: #f8f9fa;
                padding: 10px 12px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
            }
            
            .entity-card-header:hover {
                background: #e9ecef;
            }
            
            .entity-title {
                font-weight: 600;
                color: #495057;
                font-size: 14px;
            }
            
            .entity-type {
                font-size: 11px;
                color: #6c757d;
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 8px;
            }
            
            .entity-meta {
                font-size: 11px;
                color: #6c757d;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .expand-icon {
                transition: transform 0.2s;
                font-size: 12px;
            }
            
            .expand-icon.expanded {
                transform: rotate(90deg);
            }
            
            .entity-attributes {
                padding: 12px;
                background: #fdfdfe;
                display: none;
            }
            
            .entity-attributes.expanded {
                display: block;
            }
            
            .attribute-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 6px 0;
                border-bottom: 1px solid #f1f3f4;
            }
            
            .attribute-item:last-child {
                border-bottom: none;
            }
            
            .attribute-label {
                min-width: 80px;
                font-size: 12px;
                font-weight: 500;
                color: #495057;
            }
            
            .attribute-type {
                font-size: 10px;
                color: #6c757d;
                background: #e9ecef;
                padding: 1px 4px;
                border-radius: 3px;
                min-width: 40px;
                text-align: center;
            }
            
            .attribute-value {
                flex: 1;
            }
            
            .attribute-input {
                width: 100%;
                padding: 4px 8px;
                border: 1px solid #ced4da;
                border-radius: 3px;
                font-size: 12px;
                background: white;
                transition: border-color 0.2s;
            }
            
            .attribute-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.25);
            }
            
            .attribute-input.readonly {
                background: #f8f9fa;
                color: #6c757d;
                cursor: not-allowed;
            }
            
            .attribute-actions {
                display: flex;
                gap: 4px;
            }
            
            .attribute-btn {
                background: none;
                border: none;
                padding: 2px 4px;
                border-radius: 2px;
                cursor: pointer;
                font-size: 10px;
                opacity: 0.6;
                transition: opacity 0.2s;
            }
            
            .attribute-btn:hover {
                opacity: 1;
                background: #f8f9fa;
            }
            
            .new-attribute-form {
                margin-top: 12px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
                border: 1px dashed #ced4da;
            }
            
            .new-attribute-form input, .new-attribute-form select {
                width: 100%;
                padding: 4px 8px;
                border: 1px solid #ced4da;
                border-radius: 3px;
                font-size: 12px;
                margin-bottom: 6px;
                box-sizing: border-box;
            }
            
            .new-attribute-actions {
                display: flex;
                gap: 6px;
                justify-content: flex-end;
            }
            
            .new-attribute-actions button {
                padding: 4px 8px;
                border: none;
                border-radius: 3px;
                font-size: 11px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .btn-add {
                background: #28a745;
                color: white;
            }
            
            .btn-add:hover {
                background: #218838;
            }
            
            .btn-cancel {
                background: #6c757d;
                color: white;
            }
            
            .btn-cancel:hover {
                background: #545b62;
            }
            
            .entity-manager.collapsed .entity-manager-content {
                display: none;
            }
            
            .update-indicator {
                display: inline-block;
                width: 6px;
                height: 6px;
                background: #28a745;
                border-radius: 50%;
                margin-left: 4px;
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    bindUIEvents() {
        // Toggle visibilità
        this.container.querySelector('.btn-toggle').addEventListener('click', () => {
            this.toggleVisibility();
        });
        
        // Refresh
        this.container.querySelector('.btn-refresh').addEventListener('click', () => {
            this.refresh();
        });
        
        // Nuova entità
        this.container.querySelector('.btn-add-entity').addEventListener('click', () => {
            this.showNewEntityDialog();
        });
        
        // Ricerca
        this.container.querySelector('#entitySearchInput').addEventListener('input', (e) => {
            this.filterEntities(e.target.value);
        });
    }
    
    setupEventListeners() {
        // Ascolta tutti i cambiamenti nel sistema
        this.eventBus.on('entity.created', (data) => {
            this.addEntity(data.entity);
            this.updateStats();
        });
        
        this.eventBus.on('entity.updated', (data) => {
            this.updateEntityDisplay(data.entity);
            this.updateStats();
        });
        
        this.eventBus.on('entity.deleted', (data) => {
            this.removeEntity(data.entityId);
            this.updateStats();
        });
        
        // Ascolta cambiamenti attributi globalmente
        this.attributeSpace.subscribeGlobal((data) => {
            console.log('[EntityManager] Ricevuto evento AttributeSpace:', data);
            if (data && data.eventType === 'attribute:changed') {
                this.updateAttributeDisplay(data.entityId, data.attributeName, data.newValue);
            }
            if (data && data.eventType === 'attribute:registered') {
                // Aggiorna la visualizzazione quando viene registrato un nuovo attributo
                const entity = this.entities.get(data.entityId);
                if (entity) {
                    this.updateEntityDisplay(entity);
                    this.updateStats();
                }
            }
        });
    }
    
    loadExistingEntities() {
        // Carica entità esistenti dal sistema
        if (this.attributeSpace && this.attributeSpace.entities) {
            this.attributeSpace.entities.forEach((entity, entityId) => {
                this.addEntity(entity);
            });
        }
        
        // Ascolta anche eventi di registrazione entità
        this.eventBus.on('entity:registered', (data) => {
            this.addEntity(data.entity);
            this.updateStats();
        });
        
        this.eventBus.on('entity:unregistered', (data) => {
            this.removeEntity(data.entityId);
            this.updateStats();
        });
        
        this.updateStats();
    }
    
    addEntity(entity) {
        if (this.entities.has(entity.id)) {
            this.updateEntityDisplay(entity);
            return;
        }
        
        this.entities.set(entity.id, entity);
        
        // Configura listener per eventi dell'entità
        entity.on('attribute:created', (event) => {
            console.log(`[EntityManager] Attributo creato su entità ${entity.id}:`, event.attribute.name);
            this.updateEntityDisplay(entity);
            this.updateStats();
        });
        
        entity.on('attribute:changed', (event) => {
            console.log(`[EntityManager] Attributo modificato su entità ${entity.id}:`, event.attribute.name);
            this.updateAttributeDisplay(entity.id, event.attribute.name, event.newValue);
        });
        
        entity.on('attribute:removed', (event) => {
            console.log(`[EntityManager] Attributo rimosso da entità ${entity.id}:`, event.attribute.name);
            this.updateEntityDisplay(entity);
            this.updateStats();
        });
        
        this.renderEntity(entity);
        this.updateEmptyState();
    }
    
    removeEntity(entityId) {
        this.entities.delete(entityId);
        const entityElement = this.container.querySelector(`[data-entity-id="${entityId}"]`);
        if (entityElement) {
            entityElement.remove();
        }
        this.updateEmptyState();
    }
    
    renderEntity(entity) {
        const entityList = this.container.querySelector('#entityList');
        const emptyState = entityList.querySelector('.empty-state');
        if (emptyState) emptyState.style.display = 'none';
        
        const entityCard = document.createElement('div');
        entityCard.className = 'entity-card';
        entityCard.setAttribute('data-entity-id', entity.id);
        
        entityCard.innerHTML = `
            <div class="entity-card-header" onclick="this.parentElement.querySelector('.entity-attributes').classList.toggle('expanded'); this.querySelector('.expand-icon').classList.toggle('expanded')">
                <div>
                    <span class="entity-title">${entity.id}</span>
                    <span class="entity-type">${entity.type || 'Generic'}</span>
                </div>
                <div class="entity-meta">
                    <span>${entity.attributes ? (entity.attributes instanceof Map ? entity.attributes.size : Object.keys(entity.attributes).length) : 0} attributi</span>
                    <span class="expand-icon">▶</span>
                </div>
            </div>
            <div class="entity-attributes">
                <div class="attributes-list"></div>
                <div class="new-attribute-form" style="display: none;">
                    <input type="text" placeholder="Nome attributo" class="new-attr-name">
                    <select class="new-attr-type">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="url">URL</option>
                        <option value="date">Date</option>
                        <option value="boolean">Boolean</option>
                    </select>
                    <input type="text" placeholder="Valore iniziale" class="new-attr-value">
                    <div class="new-attribute-actions">
                        <button class="btn-add" onclick="this.closest('.entity-card').entityManager.addNewAttribute(this)">Aggiungi</button>
                        <button class="btn-cancel" onclick="this.closest('.new-attribute-form').style.display='none'">Annulla</button>
                    </div>
                </div>
                <button class="attribute-btn" onclick="this.previousElementSibling.style.display='block'" style="margin-top: 8px; padding: 4px 8px; background: #e9ecef;">+ Nuovo Attributo</button>
            </div>
        `;
        
        // Riferimento per callback
        entityCard.entityManager = this;
        
        entityList.appendChild(entityCard);
        this.renderEntityAttributes(entity);
    }
    
    renderEntityAttributes(entity) {
        const entityCard = this.container.querySelector(`[data-entity-id="${entity.id}"]`);
        if (!entityCard) return;
        
        const attributesList = entityCard.querySelector('.attributes-list');
        attributesList.innerHTML = '';
        
        const hasAttributes = entity.attributes && (
            entity.attributes instanceof Map ? entity.attributes.size > 0 : Object.keys(entity.attributes).length > 0
        );
        
        if (!hasAttributes) {
            attributesList.innerHTML = '<div style="text-align: center; color: #6c757d; font-size: 12px; padding: 12px;">Nessun attributo</div>';
            return;
        }
        
        const attributeEntries = entity.attributes instanceof Map ? 
            Array.from(entity.attributes.entries()) : 
            Object.entries(entity.attributes);
            
        attributeEntries.forEach(([name, attribute]) => {
            const attributeItem = document.createElement('div');
            attributeItem.className = 'attribute-item';
            attributeItem.setAttribute('data-attribute-name', name);
            
            const isEditable = attribute.metadata?.editable !== false;
            const inputType = this.getInputType(attribute.type);
            
            attributeItem.innerHTML = `
                <div class="attribute-label">${name}</div>
                <div class="attribute-type">${attribute.type}</div>
                <div class="attribute-value">
                    <input type="${inputType}" 
                           class="attribute-input ${!isEditable ? 'readonly' : ''}" 
                           value="${this.formatAttributeValue(attribute.value, attribute.type)}"
                           ${!isEditable ? 'readonly' : ''}
                           onchange="this.closest('.entity-card').entityManager.updateAttributeValue('${entity.id}', '${name}', this.value, '${attribute.type}')">
                </div>
                <div class="attribute-actions">
                    <button class="attribute-btn" title="Elimina" onclick="this.closest('.entity-card').entityManager.deleteAttribute('${entity.id}', '${name}')">🗑️</button>
                </div>
            `;
            
            attributesList.appendChild(attributeItem);
        });
    }
    
    updateEntityDisplay(entity) {
        const entityCard = this.container.querySelector(`[data-entity-id="${entity.id}"]`);
        if (!entityCard) {
            this.renderEntity(entity);
            return;
        }
        
        // Aggiorna conteggio attributi
        const metaSpan = entityCard.querySelector('.entity-meta span');
        if (metaSpan) {
            const count = entity.attributes ? (entity.attributes instanceof Map ? entity.attributes.size : Object.keys(entity.attributes).length) : 0;
            metaSpan.textContent = `${count} attributi`;
        }
        
        // Re-render attributi
        this.renderEntityAttributes(entity);
        
        // Mostra indicatore di aggiornamento
        this.showUpdateIndicator(entityCard);
    }
    
    updateAttributeDisplay(entityId, attributeName, value) {
        const attributeInput = this.container.querySelector(
            `[data-entity-id="${entityId}"] [data-attribute-name="${attributeName}"] .attribute-input`
        );
        
        if (attributeInput && attributeInput !== document.activeElement) {
            const entity = this.entities.get(entityId);
            if (entity) {
                const attribute = entity.attributes instanceof Map ? 
                    entity.attributes.get(attributeName) : 
                    entity.attributes[attributeName];
                    
                if (attribute) {
                    attributeInput.value = this.formatAttributeValue(value, attribute.type);
                    this.showUpdateIndicator(attributeInput.closest('.entity-card'));
                }
            }
        }
    }
    
    updateAttributeValue(entityId, attributeName, value, type) {
        const entity = this.entities.get(entityId);
        if (!entity) return;
        
        try {
            // Converte il valore al tipo corretto
            const convertedValue = this.convertValue(value, type);
            entity.setAttribute(attributeName, convertedValue, type);
            
            console.log(`[EntityManager] Attributo aggiornato: ${entityId}.${attributeName} = ${convertedValue}`);
        } catch (error) {
            console.error(`[EntityManager] Errore aggiornamento attributo:`, error);
            // Ripristina valore precedente
            const attributeInput = this.container.querySelector(
                `[data-entity-id="${entityId}"] [data-attribute-name="${attributeName}"] .attribute-input`
            );
            const attribute = entity.attributes instanceof Map ? 
                entity.attributes.get(attributeName) : 
                entity.attributes[attributeName];
                
            if (attributeInput && attribute) {
                attributeInput.value = this.formatAttributeValue(attribute.value, type);
            }
        }
    }
    
    addNewAttribute(button) {
        const form = button.closest('.new-attribute-form');
        const entityCard = button.closest('.entity-card');
        const entityId = entityCard.getAttribute('data-entity-id');
        const entity = this.entities.get(entityId);
        
        if (!entity) return;
        
        const name = form.querySelector('.new-attr-name').value.trim();
        const type = form.querySelector('.new-attr-type').value;
        const value = form.querySelector('.new-attr-value').value;
        
        if (!name) {
            alert('Inserisci un nome per l\'attributo');
            return;
        }
        
        const hasAttribute = entity.attributes && (
            entity.attributes instanceof Map ? entity.attributes.has(name) : entity.attributes[name]
        );
        
        if (hasAttribute) {
            alert('Attributo già esistente');
            return;
        }
        
        try {
            const convertedValue = this.convertValue(value, type);
            entity.setAttribute(name, convertedValue, type);
            
            // Forza aggiornamento della visualizzazione
            setTimeout(() => {
                this.updateEntityDisplay(entity);
                this.updateStats();
            }, 100);
            
            // Reset form
            form.querySelector('.new-attr-name').value = '';
            form.querySelector('.new-attr-value').value = '';
            form.style.display = 'none';
            
            console.log(`[EntityManager] Nuovo attributo creato: ${entityId}.${name} = ${convertedValue}`);
        } catch (error) {
            console.error(`[EntityManager] Errore creazione attributo:`, error);
            alert('Errore nella creazione dell\'attributo: ' + error.message);
        }
    }
    
    deleteAttribute(entityId, attributeName) {
        if (!confirm(`Eliminare l'attributo "${attributeName}"?`)) return;
        
        const entity = this.entities.get(entityId);
        if (!entity) return;
        
        try {
            // Rimuovi l'attributo dall'entità
            const hasAttribute = entity.attributes && (
                entity.attributes instanceof Map ? entity.attributes.has(attributeName) : entity.attributes[attributeName]
            );
            
            if (hasAttribute) {
                if (entity.attributes instanceof Map) {
                    entity.attributes.delete(attributeName);
                } else {
                    delete entity.attributes[attributeName];
                }
                
                // Rimuovi anche dal registry AttributeSpace
                this.attributeSpace.unregisterAttribute(entityId, attributeName);
                
                // Emetti evento di aggiornamento
                this.eventBus.emit('entity.updated', { entity });
                
                // Aggiorna la visualizzazione
                this.updateEntityDisplay(entity);
                
                console.log(`[EntityManager] Attributo eliminato: ${entityId}.${attributeName}`);
            }
        } catch (error) {
            console.error(`[EntityManager] Errore eliminazione attributo:`, error);
        }
    }
    
    showNewEntityDialog() {
        const entityId = prompt('ID della nuova entità:');
        if (!entityId || !entityId.trim()) return;
        
        const entityType = prompt('Tipo di entità (opzionale):', 'Generic');
        
        try {
            const Entity = window.Entity;
            const newEntity = new Entity(entityType || 'Generic', entityId.trim());
            
            // Registra nel sistema AttributeSpace
            this.attributeSpace.registerEntity(newEntity);
            
            // Aggiungi all'EntityManager
            this.addEntity(newEntity);
            
            // Emetti anche evento legacy per compatibilità
            this.eventBus.emit('entity.created', { entity: newEntity });
            
            console.log(`[EntityManager] Nuova entità creata: ${newEntity.id}`);
        } catch (error) {
            console.error(`[EntityManager] Errore creazione entità:`, error);
            alert('Errore nella creazione dell\'entità: ' + error.message);
        }
    }
    
    filterEntities(searchTerm) {
        const entityCards = this.container.querySelectorAll('.entity-card');
        const term = searchTerm.toLowerCase();
        
        entityCards.forEach(card => {
            const entityId = card.getAttribute('data-entity-id').toLowerCase();
            const entityType = card.querySelector('.entity-type').textContent.toLowerCase();
            
            const matches = entityId.includes(term) || entityType.includes(term);
            card.style.display = matches ? 'block' : 'none';
        });
    }
    
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        const manager = this.container.querySelector('.entity-manager');
        manager.classList.toggle('collapsed', !this.isVisible);
        
        const button = this.container.querySelector('.btn-toggle');
        button.textContent = this.isVisible ? '👁️' : '👁️‍🗨️';
    }
    
    refresh() {
        this.entities.clear();
        this.container.querySelector('#entityList').innerHTML = '<div class="empty-state"><p>Caricamento...</p></div>';
        
        setTimeout(() => {
            this.loadExistingEntities();
            this.updateStats();
            console.log('[EntityManager] Refresh completato');
        }, 500);
    }
    
    updateStats() {
        const entityCount = this.entities.size;
        let attributeCount = 0;
        
        this.entities.forEach(entity => {
            if (entity.attributes) {
                attributeCount += entity.attributes instanceof Map ? entity.attributes.size : Object.keys(entity.attributes).length;
            }
        });
        
        const entityCountEl = this.container.querySelector('#entityCount');
        const attributeCountEl = this.container.querySelector('#attributeCount');
        
        if (entityCountEl) entityCountEl.textContent = entityCount;
        if (attributeCountEl) attributeCountEl.textContent = attributeCount;
    }
    
    updateEmptyState() {
        const entityList = this.container.querySelector('#entityList');
        const emptyState = entityList.querySelector('.empty-state');
        const hasEntities = this.entities.size > 0;
        
        if (emptyState) {
            emptyState.style.display = hasEntities ? 'none' : 'block';
        }
    }
    
    showUpdateIndicator(entityCard) {
        const header = entityCard.querySelector('.entity-card-header');
        let indicator = header.querySelector('.update-indicator');
        
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'update-indicator';
            header.appendChild(indicator);
        }
        
        // Rimuovi dopo 2 secondi
        setTimeout(() => {
            if (indicator && indicator.parentNode) {
                indicator.remove();
            }
        }, 2000);
    }
    
    getInputType(attributeType) {
        const typeMap = {
            'email': 'email',
            'url': 'url',
            'number': 'number',
            'date': 'date',
            'boolean': 'checkbox',
            'text': 'text'
        };
        return typeMap[attributeType] || 'text';
    }
    
    formatAttributeValue(value, type) {
        if (value === null || value === undefined) return '';
        
        if (type === 'boolean') {
            return value ? 'true' : 'false';
        }
        
        if (type === 'date' && value instanceof Date) {
            return value.toISOString().split('T')[0];
        }
        
        return String(value);
    }
    
    convertValue(value, type) {
        if (value === '' || value === null || value === undefined) {
            return type === 'boolean' ? false : '';
        }
        
        switch (type) {
            case 'number':
                const num = parseFloat(value);
                if (isNaN(num)) throw new Error('Valore numerico non valido');
                return num;
                
            case 'boolean':
                return value === 'true' || value === true || value === '1';
                
            case 'date':
                const date = new Date(value);
                if (isNaN(date.getTime())) throw new Error('Data non valida');
                return date;
                
            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    throw new Error('Email non valida');
                }
                return value;
                
            case 'url':
                if (value && !/^https?:\/\/.+/.test(value)) {
                    throw new Error('URL non valido');
                }
                return value;
                
            default:
                return String(value);
        }
    }
}

// Export per uso globale
if (typeof window !== 'undefined') {
    window.EntityManager = EntityManager;
} 