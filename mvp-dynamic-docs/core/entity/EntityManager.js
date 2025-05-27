/**
 * EntityManager - Gestisce la persistenza e il ciclo di vita delle entità
 * Integra AttributeSpace con StorageManager per il vero SSOT
 */
class EntityManager {
    constructor() {
        this.storageManager = window.storageManager || null;
        this.attributeSpace = window.attributeSpace || null;
        this.eventBus = window.eventBus || null;
        
        this.autoSave = true;
        this.saveDebounceTime = 1000; // 1 secondo
        this.saveTimeouts = new Map(); // entityId -> timeout
        
        this.initialized = false;
        this.entityPrefix = 'entity:';
        this.metadataKey = 'entities:metadata';
    }

    /**
     * Inizializza l'EntityManager
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('[EntityManager] Inizializzazione...');
        
        if (!this.storageManager) {
            throw new Error('StorageManager non disponibile');
        }
        
        if (!this.attributeSpace) {
            throw new Error('AttributeSpace non disponibile');
        }
        
        // Carica tutte le entità esistenti
        await this.loadAllEntities();
        
        // Setup listeners per auto-save
        this.setupAutoSave();
        
        this.initialized = true;
        console.log('[EntityManager] Inizializzazione completata');
        
        if (this.eventBus) {
            this.eventBus.emit('entityManager.initialized', {
                entitiesLoaded: this.attributeSpace.getAllEntities().size
            });
        }
    }

    /**
     * Carica tutte le entità dal storage
     */
    async loadAllEntities() {
        console.log('[EntityManager] Caricamento entità dal storage...');
        
        try {
            // Cerca tutte le entità nel storage
            const entityData = await this.storageManager.query({ 
                key: new RegExp(`^${this.entityPrefix}`) 
            });
            
            console.log(`[EntityManager] Trovate ${entityData.length} entità nel storage`);
            
            for (const item of entityData) {
                try {
                    const entity = this.deserializeEntity(item.value);
                    if (entity) {
                        // Registra nell'AttributeSpace senza triggering auto-save
                        this.attributeSpace.registerEntity(entity);
                        console.log(`[EntityManager] Entità caricata: ${entity.id} (${entity.type})`);
                    }
                } catch (error) {
                    console.error(`[EntityManager] Errore caricamento entità ${item.key}:`, error);
                }
            }
            
            console.log(`[EntityManager] Caricamento completato. ${this.attributeSpace.getAllEntities().size} entità attive.`);
            
        } catch (error) {
            console.error('[EntityManager] Errore caricamento entità:', error);
        }
    }

    /**
     * Setup auto-save per le modifiche alle entità
     */
    setupAutoSave() {
        if (!this.autoSave) return;
        
        console.log('[EntityManager] Setup auto-save...');
        
        // Ascolta tutti i cambiamenti dall'AttributeSpace
        this.attributeSpace.subscribeGlobal((event) => {
            this.handleEntityChange(event);
        });
        
        // Ascolta creazione di nuove entità
        if (this.eventBus) {
            this.eventBus.on('entity.created', (event) => {
                this.scheduleEntitySave(event.entityId);
            });
        }
    }

    /**
     * Gestisce i cambiamenti alle entità per auto-save
     * @param {object} event - Evento di cambiamento
     */
    handleEntityChange(event) {
        if (!event || !event.entityId) return;
        
        // Solo per eventi di modifica attributi
        if (event.eventType === 'attribute:changed' || 
            event.eventType === 'attribute:created' ||
            event.eventType === 'entity:registered') {
            
            console.log(`[EntityManager] Schedulazione salvataggio per entità: ${event.entityId}`);
            this.scheduleEntitySave(event.entityId);
        }
    }

    /**
     * Programma il salvataggio di un'entità con debounce
     * @param {string} entityId - ID dell'entità
     */
    scheduleEntitySave(entityId) {
        // Cancella timeout precedente se esiste
        if (this.saveTimeouts.has(entityId)) {
            clearTimeout(this.saveTimeouts.get(entityId));
        }
        
        // Programma nuovo salvataggio
        const timeout = setTimeout(async () => {
            await this.saveEntity(entityId);
            this.saveTimeouts.delete(entityId);
        }, this.saveDebounceTime);
        
        this.saveTimeouts.set(entityId, timeout);
    }

    /**
     * Salva un'entità nel storage
     * @param {string} entityId - ID dell'entità
     */
    async saveEntity(entityId) {
        try {
            const entity = this.attributeSpace.getEntity(entityId);
            if (!entity) {
                console.warn(`[EntityManager] Entità ${entityId} non trovata per il salvataggio`);
                return;
            }
            
            const serializedEntity = this.serializeEntity(entity);
            const storageKey = `${this.entityPrefix}${entityId}`;
            
            await this.storageManager.save(storageKey, serializedEntity);
            console.log(`[EntityManager] Entità salvata: ${entityId}`);
            
            // Aggiorna metadati
            await this.updateEntityMetadata(entity);
            
            if (this.eventBus) {
                this.eventBus.emit('entity.saved', {
                    entityId,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error(`[EntityManager] Errore salvataggio entità ${entityId}:`, error);
        }
    }

    /**
     * Crea una nuova entità e la persiste
     * @param {string} type - Tipo di entità
     * @param {string} id - ID dell'entità (opzionale)
     * @param {object} initialData - Dati iniziali (opzionale)
     * @returns {Entity}
     */
    async createEntity(type, id = null, initialData = {}) {
        const entityId = id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`[EntityManager] Creazione entità: ${entityId} (${type})`);
        
        // Crea l'entità
        const entity = new Entity(type, entityId);
        
        // Aggiungi attributi iniziali se forniti
        for (const [name, value] of Object.entries(initialData)) {
            const attributeType = this.inferAttributeType(value);
            entity.setAttribute(name, value, attributeType);
        }
        
        // Registra nell'AttributeSpace
        this.attributeSpace.registerEntity(entity);
        
        // Salva immediatamente
        await this.saveEntity(entityId);
        
        if (this.eventBus) {
            this.eventBus.emit('entity.created', {
                entityId,
                entityType: type,
                entity,
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`[EntityManager] Entità creata e salvata: ${entityId}`);
        return entity;
    }

    /**
     * Elimina un'entità
     * @param {string} entityId - ID dell'entità
     */
    async deleteEntity(entityId) {
        console.log(`[EntityManager] Eliminazione entità: ${entityId}`);
        
        try {
            // Rimuovi dall'AttributeSpace
            this.attributeSpace.unregisterEntity(entityId);
            
            // Rimuovi dal storage
            const storageKey = `${this.entityPrefix}${entityId}`;
            await this.storageManager.delete(storageKey);
            
            // Cancella timeout di salvataggio se presente
            if (this.saveTimeouts.has(entityId)) {
                clearTimeout(this.saveTimeouts.get(entityId));
                this.saveTimeouts.delete(entityId);
            }
            
            // Aggiorna metadati
            await this.removeEntityFromMetadata(entityId);
            
            if (this.eventBus) {
                this.eventBus.emit('entity.deleted', {
                    entityId,
                    timestamp: new Date().toISOString()
                });
            }
            
            console.log(`[EntityManager] Entità eliminata: ${entityId}`);
            
        } catch (error) {
            console.error(`[EntityManager] Errore eliminazione entità ${entityId}:`, error);
        }
    }

    /**
     * Ottiene tutte le entità di un tipo specifico
     * @param {string} type - Tipo di entità
     * @returns {Array<Entity>}
     */
    getEntitiesByType(type) {
        return this.attributeSpace.getEntitiesByType(type);
    }

    /**
     * Ottiene tutte le entità
     * @returns {Map<string, Entity>}
     */
    getAllEntities() {
        return this.attributeSpace.getAllEntities();
    }

    /**
     * Ottiene un'entità specifica
     * @param {string} entityId - ID dell'entità
     * @returns {Entity|null}
     */
    getEntity(entityId) {
        return this.attributeSpace.getEntity(entityId);
    }

    /**
     * Serializza un'entità per il storage
     * @param {Entity} entity - Entità da serializzare
     * @returns {object}
     */
    serializeEntity(entity) {
        const serialized = {
            id: entity.id,
            type: entity.type,
            attributes: {},
            metadata: {
                createdAt: entity.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: entity.version || '1.0.0'
            }
        };
        
        // Serializza attributi
        if (entity.attributes) {
            if (entity.attributes instanceof Map) {
                for (const [name, attribute] of entity.attributes) {
                    serialized.attributes[name] = {
                        name: attribute.name,
                        value: attribute.value,
                        type: attribute.type,
                        metadata: attribute.metadata || {}
                    };
                }
            } else {
                for (const [name, attribute] of Object.entries(entity.attributes)) {
                    serialized.attributes[name] = {
                        name: attribute.name,
                        value: attribute.value,
                        type: attribute.type,
                        metadata: attribute.metadata || {}
                    };
                }
            }
        }
        
        return serialized;
    }

    /**
     * Deserializza un'entità dal storage
     * @param {object} data - Dati serializzati
     * @returns {Entity|null}
     */
    deserializeEntity(data) {
        try {
            const entity = new Entity(data.type, data.id);
            
            // Ripristina metadati
            if (data.metadata) {
                entity.createdAt = data.metadata.createdAt;
                entity.version = data.metadata.version;
            }
            
            // Ripristina attributi
            if (data.attributes) {
                for (const [name, attrData] of Object.entries(data.attributes)) {
                    const attribute = new Attribute(
                        attrData.name,
                        attrData.value,
                        attrData.type,
                        attrData.metadata || {}
                    );
                    entity.attributes.set(name, attribute);
                }
            }
            
            return entity;
            
        } catch (error) {
            console.error('[EntityManager] Errore deserializzazione entità:', error);
            return null;
        }
    }

    /**
     * Inferisce il tipo di attributo dal valore
     * @param {any} value - Valore dell'attributo
     * @returns {string}
     */
    inferAttributeType(value) {
        if (typeof value === 'string') {
            if (value.includes('@')) return 'email';
            if (value.startsWith('http')) return 'url';
            if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
            return 'text';
        }
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        return 'text';
    }

    /**
     * Aggiorna i metadati delle entità
     * @param {Entity} entity - Entità
     */
    async updateEntityMetadata(entity) {
        try {
            let metadata = {};
            try {
                metadata = await this.storageManager.load(this.metadataKey) || {};
            } catch (error) {
                // Metadati non esistono ancora
            }
            
            metadata[entity.id] = {
                type: entity.type,
                lastUpdated: new Date().toISOString(),
                attributeCount: entity.attributes ? entity.attributes.size : 0
            };
            
            await this.storageManager.save(this.metadataKey, metadata);
            
        } catch (error) {
            console.error('[EntityManager] Errore aggiornamento metadati:', error);
        }
    }

    /**
     * Rimuove un'entità dai metadati
     * @param {string} entityId - ID dell'entità
     */
    async removeEntityFromMetadata(entityId) {
        try {
            const metadata = await this.storageManager.load(this.metadataKey) || {};
            delete metadata[entityId];
            await this.storageManager.save(this.metadataKey, metadata);
        } catch (error) {
            console.error('[EntityManager] Errore rimozione metadati:', error);
        }
    }

    /**
     * Forza il salvataggio di tutte le entità
     */
    async saveAllEntities() {
        console.log('[EntityManager] Salvataggio forzato di tutte le entità...');
        
        const entities = this.attributeSpace.getAllEntities();
        const savePromises = [];
        
        for (const [entityId] of entities) {
            savePromises.push(this.saveEntity(entityId));
        }
        
        await Promise.allSettled(savePromises);
        console.log(`[EntityManager] Salvate ${savePromises.length} entità`);
    }

    /**
     * Ottiene statistiche dell'EntityManager
     * @returns {object}
     */
    getStats() {
        const entities = this.attributeSpace.getAllEntities();
        const typeCount = {};
        
        for (const entity of entities.values()) {
            typeCount[entity.type] = (typeCount[entity.type] || 0) + 1;
        }
        
        return {
            totalEntities: entities.size,
            entitiesByType: typeCount,
            pendingSaves: this.saveTimeouts.size,
            autoSaveEnabled: this.autoSave,
            initialized: this.initialized
        };
    }

    /**
     * Pulisce tutte le entità (solo per testing)
     */
    async clearAllEntities() {
        console.warn('[EntityManager] Pulizia di tutte le entità!');
        
        const entities = this.attributeSpace.getAllEntities();
        for (const [entityId] of entities) {
            await this.deleteEntity(entityId);
        }
        
        // Pulisci anche i metadati
        await this.storageManager.delete(this.metadataKey);
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.EntityManager = EntityManager;
} 