/**
 * AttributeSpace - Registry globale degli attributi e sistema di sottoscrizioni
 * Gestisce la propagazione delle modifiche tra moduli e entità
 */
class AttributeSpace {
    constructor() {
        this.attributes = new Map(); // entityId+attrName -> Attribute
        this.entities = new Map(); // entityId -> Entity
        this.subscriptions = new Map(); // attrKey -> Set<callback>
        this.entitySubscriptions = new Map(); // entityId -> Set<callback>
        this.typeSubscriptions = new Map(); // entityType -> Set<callback>
        this.globalSubscriptions = new Set(); // callback per tutti i cambiamenti
        
        this.changeHistory = [];
        this.maxHistorySize = 1000;
        
        this.setupGlobalListeners();
    }

    /**
     * Registra un'entità completa con tutti i suoi attributi
     * @param {Entity} entity - Entità da registrare
     */
    registerEntity(entity) {
        console.log(`[AttributeSpace] Registrazione entità: ${entity.id} (${entity.type})`);
        
        // Registra l'entità nella mappa
        this.entities.set(entity.id, entity);
        
        // Registra tutti gli attributi esistenti
        if (entity.attributes) {
            if (entity.attributes instanceof Map) {
                // Entity usa Map per gli attributi
                for (const [name, attribute] of entity.attributes) {
                    this.registerAttribute(entity.id, attribute);
                }
            } else {
                // Oggetto normale
                for (const [name, attribute] of Object.entries(entity.attributes)) {
                    this.registerAttribute(entity.id, attribute);
                }
            }
        }
        
        // Ascolta i cambiamenti futuri dell'entità
        entity.on('attribute:changed', (event) => {
            console.log('[AttributeSpace] Ricevuto evento da entità:', event);
            this.notifyChange('attribute:changed', {
                entityId: entity.id,
                entityType: entity.type,
                attributeName: event.attribute.name,
                newValue: event.newValue,
                oldValue: event.oldValue,
                timestamp: new Date().toISOString()
            });
        });
        
        entity.on('attribute:created', (event) => {
            this.registerAttribute(entity.id, event.attribute);
        });
        
        // Notifica registrazione entità
        this.notifyChange('entity:registered', {
            entityId: entity.id,
            entityType: entity.type,
            entity,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Rimuove un'entità dal registry
     * @param {string} entityId - ID dell'entità da rimuovere
     */
    unregisterEntity(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        console.log(`[AttributeSpace] Rimozione entità: ${entityId}`);
        
        // Rimuovi tutti gli attributi dell'entità
        if (entity.attributes) {
            for (const attributeName of Object.keys(entity.attributes)) {
                this.unregisterAttribute(entityId, attributeName);
            }
        }
        
        // Rimuovi l'entità dalla mappa
        this.entities.delete(entityId);
        
        // Rimuovi sottoscrizioni dell'entità
        this.entitySubscriptions.delete(entityId);
        
        // Notifica rimozione entità
        this.notifyChange('entity:unregistered', {
            entityId,
            entity,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Ottiene un'entità dal registry
     * @param {string} entityId - ID dell'entità
     * @returns {Entity|null}
     */
    getEntity(entityId) {
        return this.entities.get(entityId) || null;
    }

    /**
     * Ottiene tutte le entità registrate
     * @returns {Map<string, Entity>}
     */
    getAllEntities() {
        return new Map(this.entities);
    }

    /**
     * Ottiene entità per tipo
     * @param {string} entityType - Tipo di entità
     * @returns {Array<Entity>}
     */
    getEntitiesByType(entityType) {
        const result = [];
        for (const entity of this.entities.values()) {
            if (entity.type === entityType) {
                result.push(entity);
            }
        }
        return result;
    }

    /**
     * Registra un attributo nel registry globale
     * @param {string} entityId - ID dell'entità
     * @param {Attribute} attribute - Attributo da registrare
     */
    registerAttribute(entityId, attribute) {
        const key = this.getAttributeKey(entityId, attribute.name);
        this.attributes.set(key, attribute);
        
        // Notifica la registrazione
        this.notifyChange('attribute:registered', {
            entityId,
            attributeName: attribute.name,
            attribute,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Rimuove un attributo dal registry
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     */
    unregisterAttribute(entityId, attributeName) {
        const key = this.getAttributeKey(entityId, attributeName);
        const attribute = this.attributes.get(key);
        
        if (attribute) {
            this.attributes.delete(key);
            
            // Rimuovi tutte le sottoscrizioni per questo attributo
            this.subscriptions.delete(key);
            
            this.notifyChange('attribute:unregistered', {
                entityId,
                attributeName,
                attribute,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Ottiene un attributo dal registry
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     * @returns {Attribute|null}
     */
    getAttribute(entityId, attributeName) {
        const key = this.getAttributeKey(entityId, attributeName);
        return this.attributes.get(key) || null;
    }

    /**
     * Verifica se un attributo esiste nel registry
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     * @returns {boolean}
     */
    hasAttribute(entityId, attributeName) {
        const key = this.getAttributeKey(entityId, attributeName);
        return this.attributes.has(key);
    }

    /**
     * Sottoscrive ai cambiamenti di un attributo specifico
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     * @param {Function} callback - Funzione da chiamare sui cambiamenti
     * @returns {Function} - Funzione per annullare la sottoscrizione
     */
    subscribe(entityId, attributeName, callback) {
        const key = this.getAttributeKey(entityId, attributeName);
        
        if (!this.subscriptions.has(key)) {
            this.subscriptions.set(key, new Set());
        }
        
        this.subscriptions.get(key).add(callback);
        
        // Ritorna funzione per unsubscribe
        return () => {
            if (this.subscriptions.has(key)) {
                this.subscriptions.get(key).delete(callback);
                if (this.subscriptions.get(key).size === 0) {
                    this.subscriptions.delete(key);
                }
            }
        };
    }

    /**
     * Sottoscrive ai cambiamenti di tutti gli attributi di un'entità
     * @param {string} entityId - ID dell'entità
     * @param {Function} callback - Funzione da chiamare sui cambiamenti
     * @returns {Function} - Funzione per annullare la sottoscrizione
     */
    subscribeToEntity(entityId, callback) {
        if (!this.entitySubscriptions.has(entityId)) {
            this.entitySubscriptions.set(entityId, new Set());
        }
        
        this.entitySubscriptions.get(entityId).add(callback);
        
        return () => {
            if (this.entitySubscriptions.has(entityId)) {
                this.entitySubscriptions.get(entityId).delete(callback);
                if (this.entitySubscriptions.get(entityId).size === 0) {
                    this.entitySubscriptions.delete(entityId);
                }
            }
        };
    }

    /**
     * Sottoscrive ai cambiamenti di tutte le entità di un tipo
     * @param {string} entityType - Tipo di entità
     * @param {Function} callback - Funzione da chiamare sui cambiamenti
     * @returns {Function} - Funzione per annullare la sottoscrizione
     */
    subscribeToType(entityType, callback) {
        if (!this.typeSubscriptions.has(entityType)) {
            this.typeSubscriptions.set(entityType, new Set());
        }
        
        this.typeSubscriptions.get(entityType).add(callback);
        
        return () => {
            if (this.typeSubscriptions.has(entityType)) {
                this.typeSubscriptions.get(entityType).delete(callback);
                if (this.typeSubscriptions.get(entityType).size === 0) {
                    this.typeSubscriptions.delete(entityType);
                }
            }
        };
    }

    /**
     * Sottoscrive a tutti i cambiamenti globali
     * @param {Function} callback - Funzione da chiamare sui cambiamenti
     * @returns {Function} - Funzione per annullare la sottoscrizione
     */
    subscribeGlobal(callback) {
        this.globalSubscriptions.add(callback);
        
        return () => {
            this.globalSubscriptions.delete(callback);
        };
    }

    /**
     * Notifica un cambiamento di attributo
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     * @param {any} newValue - Nuovo valore
     * @param {any} oldValue - Valore precedente
     * @param {object} metadata - Metadati aggiuntivi
     */
    notifyChange(eventType, changeData) {
        const { entityId, attributeName } = changeData;
        
        // Aggiungi alla cronologia
        this.addToHistory(eventType, changeData);
        
        // Notifica sottoscrittori specifici dell'attributo
        if (entityId && attributeName) {
            const key = this.getAttributeKey(entityId, attributeName);
            if (this.subscriptions.has(key)) {
                for (const callback of this.subscriptions.get(key)) {
                    this.safeCallback(callback, changeData);
                }
            }
        }
        
        // Notifica sottoscrittori dell'entità
        if (entityId && this.entitySubscriptions.has(entityId)) {
            for (const callback of this.entitySubscriptions.get(entityId)) {
                this.safeCallback(callback, changeData);
            }
        }
        
        // Notifica sottoscrittori del tipo (se disponibile)
        if (changeData.entityType && this.typeSubscriptions.has(changeData.entityType)) {
            for (const callback of this.typeSubscriptions.get(changeData.entityType)) {
                this.safeCallback(callback, changeData);
            }
        }
        
        // Notifica sottoscrittori globali
        console.log(`[AttributeSpace] Notifica ${this.globalSubscriptions.size} sottoscrittori globali per evento:`, eventType, changeData);
        for (const callback of this.globalSubscriptions) {
            this.safeCallback(callback, { eventType, ...changeData });
        }
        
        // Emit evento DOM globale
        this.emitDOMEvent(eventType, changeData);
    }

    /**
     * Esegue un callback in modo sicuro
     * @param {Function} callback - Callback da eseguire
     * @param {object} data - Dati da passare al callback
     */
    safeCallback(callback, data) {
        try {
            callback(data);
        } catch (error) {
            console.error('Errore nel callback AttributeSpace:', error);
        }
    }

    /**
     * Emette un evento DOM globale
     * @param {string} eventType - Tipo di evento
     * @param {object} data - Dati dell'evento
     */
    emitDOMEvent(eventType, data) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent(`attributespace:${eventType}`, {
                detail: data
            }));
        }
    }

    /**
     * Genera la chiave per un attributo
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     * @returns {string}
     */
    getAttributeKey(entityId, attributeName) {
        return `${entityId}::${attributeName}`;
    }

    /**
     * Ottiene tutti gli attributi di un'entità
     * @param {string} entityId - ID dell'entità
     * @returns {Map<string, Attribute>}
     */
    getEntityAttributes(entityId) {
        const entityAttributes = new Map();
        
        for (const [key, attribute] of this.attributes) {
            if (key.startsWith(`${entityId}::`)) {
                const attributeName = key.substring(entityId.length + 2);
                entityAttributes.set(attributeName, attribute);
            }
        }
        
        return entityAttributes;
    }

    /**
     * Ottiene tutti gli attributi di un tipo specifico
     * @param {string} attributeType - Tipo di attributo
     * @returns {Map<string, Attribute>}
     */
    getAttributesByType(attributeType) {
        const typeAttributes = new Map();
        
        for (const [key, attribute] of this.attributes) {
            if (attribute.type === attributeType) {
                typeAttributes.set(key, attribute);
            }
        }
        
        return typeAttributes;
    }

    /**
     * Cerca attributi per nome (pattern matching)
     * @param {string|RegExp} pattern - Pattern di ricerca
     * @returns {Map<string, Attribute>}
     */
    searchAttributes(pattern) {
        const results = new Map();
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
        
        for (const [key, attribute] of this.attributes) {
            if (regex.test(attribute.name)) {
                results.set(key, attribute);
            }
        }
        
        return results;
    }

    /**
     * Ottiene statistiche del registry
     * @returns {object}
     */
    getStats() {
        const typeDistribution = {};
        const entityDistribution = {};
        
        for (const [key, attribute] of this.attributes) {
            // Distribuzione per tipo
            typeDistribution[attribute.type] = (typeDistribution[attribute.type] || 0) + 1;
            
            // Distribuzione per entità
            const entityId = key.split('::')[0];
            entityDistribution[entityId] = (entityDistribution[entityId] || 0) + 1;
        }
        
        return {
            totalAttributes: this.attributes.size,
            totalSubscriptions: this.subscriptions.size,
            entitySubscriptions: this.entitySubscriptions.size,
            typeSubscriptions: this.typeSubscriptions.size,
            globalSubscriptions: this.globalSubscriptions.size,
            typeDistribution,
            entityDistribution,
            historySize: this.changeHistory.length
        };
    }

    /**
     * Aggiunge un evento alla cronologia
     * @param {string} eventType - Tipo di evento
     * @param {object} data - Dati dell'evento
     */
    addToHistory(eventType, data) {
        this.changeHistory.push({
            eventType,
            data,
            timestamp: new Date().toISOString()
        });
        
        // Mantieni la dimensione della cronologia sotto controllo
        if (this.changeHistory.length > this.maxHistorySize) {
            this.changeHistory.shift();
        }
    }

    /**
     * Ottiene la cronologia dei cambiamenti
     * @param {object} options - Opzioni di filtro
     * @returns {Array}
     */
    getHistory(options = {}) {
        let history = [...this.changeHistory];
        
        if (options.entityId) {
            history = history.filter(entry => entry.data.entityId === options.entityId);
        }
        
        if (options.attributeName) {
            history = history.filter(entry => entry.data.attributeName === options.attributeName);
        }
        
        if (options.eventType) {
            history = history.filter(entry => entry.eventType === options.eventType);
        }
        
        if (options.since) {
            const sinceDate = new Date(options.since);
            history = history.filter(entry => new Date(entry.timestamp) >= sinceDate);
        }
        
        if (options.limit) {
            history = history.slice(-options.limit);
        }
        
        return history;
    }

    /**
     * Pulisce la cronologia
     * @param {object} options - Opzioni di pulizia
     */
    clearHistory(options = {}) {
        if (options.before) {
            const beforeDate = new Date(options.before);
            this.changeHistory = this.changeHistory.filter(
                entry => new Date(entry.timestamp) >= beforeDate
            );
        } else {
            this.changeHistory = [];
        }
    }

    /**
     * Setup dei listener globali per eventi delle entità
     */
    setupGlobalListeners() {
        if (typeof window !== 'undefined') {
            // Ascolta eventi di cambiamento attributi
            window.addEventListener('attribute:change', (event) => {
                const { attribute, oldValue, newValue } = event.detail;
                
                // Trova l'entità che possiede questo attributo
                for (const [key, registeredAttr] of this.attributes) {
                    if (registeredAttr === attribute) {
                        const [entityId, attributeName] = key.split('::');
                        this.notifyChange('attribute:changed', {
                            entityId,
                            attributeName,
                            attribute,
                            oldValue,
                            newValue,
                            timestamp: new Date().toISOString()
                        });
                        break;
                    }
                }
            });
            
            // Ascolta eventi delle entità
            window.addEventListener('entity:attribute:created', (event) => {
                const { entityId, attribute } = event.detail;
                this.registerAttribute(entityId, attribute);
            });
            
            window.addEventListener('entity:attribute:removed', (event) => {
                const { entityId, attribute } = event.detail;
                this.unregisterAttribute(entityId, attribute.name);
            });
        }
    }

    /**
     * Crea un batch di operazioni per performance
     * @returns {AttributeSpaceBatch}
     */
    createBatch() {
        return new AttributeSpaceBatch(this);
    }

    /**
     * Pulisce tutte le sottoscrizioni e dati
     */
    clear() {
        this.attributes.clear();
        this.subscriptions.clear();
        this.entitySubscriptions.clear();
        this.typeSubscriptions.clear();
        this.globalSubscriptions.clear();
        this.changeHistory = [];
    }

    /**
     * Esporta lo stato corrente
     * @returns {object}
     */
    export() {
        const attributesData = {};
        for (const [key, attribute] of this.attributes) {
            attributesData[key] = attribute.serialize();
        }
        
        return {
            attributes: attributesData,
            stats: this.getStats(),
            history: this.changeHistory,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Importa uno stato precedente
     * @param {object} data - Dati da importare
     */
    import(data) {
        this.clear();
        
        if (data.attributes) {
            for (const [key, attrData] of Object.entries(data.attributes)) {
                const attribute = Attribute.deserialize(attrData);
                this.attributes.set(key, attribute);
            }
        }
        
        if (data.history) {
            this.changeHistory = data.history;
        }
    }
}

/**
 * Classe per operazioni batch su AttributeSpace
 */
class AttributeSpaceBatch {
    constructor(attributeSpace) {
        this.attributeSpace = attributeSpace;
        this.operations = [];
        this.suppressNotifications = true;
    }

    /**
     * Aggiunge un'operazione al batch
     * @param {string} operation - Tipo di operazione
     * @param {Array} args - Argomenti dell'operazione
     */
    addOperation(operation, ...args) {
        this.operations.push({ operation, args });
        return this;
    }

    /**
     * Registra un attributo nel batch
     * @param {string} entityId - ID dell'entità
     * @param {Attribute} attribute - Attributo da registrare
     */
    registerAttribute(entityId, attribute) {
        return this.addOperation('registerAttribute', entityId, attribute);
    }

    /**
     * Rimuove un attributo nel batch
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     */
    unregisterAttribute(entityId, attributeName) {
        return this.addOperation('unregisterAttribute', entityId, attributeName);
    }

    /**
     * Esegue tutte le operazioni del batch
     */
    execute() {
        const originalSuppress = this.attributeSpace.suppressNotifications;
        this.attributeSpace.suppressNotifications = this.suppressNotifications;
        
        try {
            for (const { operation, args } of this.operations) {
                this.attributeSpace[operation](...args);
            }
        } finally {
            this.attributeSpace.suppressNotifications = originalSuppress;
            
            // Notifica batch completato
            if (!this.suppressNotifications) {
                this.attributeSpace.notifyChange('batch:completed', {
                    operationCount: this.operations.length,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        this.operations = [];
    }
}

// Singleton instance
const attributeSpace = new AttributeSpace();

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.AttributeSpace = AttributeSpace;
}
// Classi già disponibili globalmente 