// Attribute sarà disponibile globalmente

/**
 * Entity - Rappresenta un'entità con attributi dinamici
 * Implementa il sistema di auto-discovery degli attributi
 */
class Entity {
    constructor(type, id = null) {
        this.id = id || this.generateId();
        this.type = type;
        this.attributes = new Map();
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        this.schemaVersion = 1;
        this.metadata = {
            source: 'user',
            tags: [],
            description: ''
        };
        
        // Sistema di eventi per notifiche
        this.eventListeners = new Map();
    }

    /**
     * Genera un ID univoco per l'entità
     * @returns {string}
     */
    generateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${this.type?.toLowerCase() || 'entity'}_${timestamp}_${random}`;
    }

    /**
     * Ottiene un attributo, creandolo se non esiste (auto-discovery)
     * @param {string} name - Nome dell'attributo
     * @param {object} options - Opzioni per la creazione automatica
     * @returns {Attribute|null}
     */
    getAttribute(name, options = {}) {
        if (this.attributes.has(name)) {
            return this.attributes.get(name);
        }

        // Auto-discovery: crea l'attributo se richiesto
        if (options.autoCreate !== false) {
            const attribute = this.createAttribute(name, options);
            this.emit('attribute:created', { entity: this, attribute, options });
            return attribute;
        }

        return null;
    }

    /**
     * Imposta un attributo, creandolo se non esiste
     * @param {string} name - Nome dell'attributo
     * @param {any} value - Valore dell'attributo
     * @param {string} type - Tipo dell'attributo
     * @param {object} metadata - Metadati aggiuntivi
     * @returns {boolean}
     */
    setAttribute(name, value, type = 'text', metadata = {}) {
        let attribute = this.attributes.get(name);
        let oldValue = null;
        
        if (!attribute) {
            // Crea nuovo attributo
            attribute = new window.Attribute(name, null, type, {
                ...metadata,
                source: 'entity'
            });
            this.attributes.set(name, attribute);
            this.emit('attribute:created', { entity: this, attribute });
        } else {
            // Salva il valore precedente prima di cambiarlo
            oldValue = attribute.getValue();
        }

        // Imposta il valore
        const success = attribute.setValue(value, { notify: false });
        
        if (success) {
            this.updatedAt = new Date().toISOString();
            
            // Emetti evento solo se il valore è effettivamente cambiato
            const currentValue = attribute.getValue();
            if (oldValue !== currentValue) {
                this.emit('attribute:changed', { 
                    entity: this, 
                    attribute, 
                    oldValue: oldValue, 
                    newValue: currentValue 
                });
            }
        }

        return success;
    }

    /**
     * Crea un nuovo attributo con auto-discovery del tipo
     * @param {string} name - Nome dell'attributo
     * @param {object} options - Opzioni per la creazione
     * @returns {Attribute}
     */
    createAttribute(name, options = {}) {
        const {
            type = this.inferType(options.value),
            value = null,
            metadata = {}
        } = options;

        const attribute = new window.Attribute(name, value, type, {
            ...metadata,
            source: 'auto-discovery',
            createdBy: options.createdBy || 'system'
        });

        this.attributes.set(name, attribute);
        this.updatedAt = new Date().toISOString();

        return attribute;
    }

    /**
     * Inferisce il tipo di un valore
     * @param {any} value - Valore da analizzare
     * @returns {string}
     */
    inferType(value) {
        if (value === null || value === undefined) {
            return 'text';
        }

        if (typeof value === 'boolean') {
            return 'boolean';
        }

        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'integer' : 'number';
        }

        if (Array.isArray(value)) {
            return 'array';
        }

        if (value instanceof Date) {
            return 'date';
        }

        if (typeof value === 'object') {
            return 'object';
        }

        if (typeof value === 'string') {
            // Prova a inferire tipi specifici per stringhe
            if (this.isEmail(value)) {
                return 'email';
            }
            if (this.isUrl(value)) {
                return 'url';
            }
            if (this.isDate(value)) {
                return 'date';
            }
            return 'text';
        }

        return 'text';
    }

    /**
     * Verifica se una stringa è un'email
     * @param {string} str - Stringa da verificare
     * @returns {boolean}
     */
    isEmail(str) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }

    /**
     * Verifica se una stringa è un URL
     * @param {string} str - Stringa da verificare
     * @returns {boolean}
     */
    isUrl(str) {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Verifica se una stringa è una data
     * @param {string} str - Stringa da verificare
     * @returns {boolean}
     */
    isDate(str) {
        const date = new Date(str);
        return !isNaN(date.getTime()) && str.length > 8;
    }

    /**
     * Ottiene il valore di un attributo
     * @param {string} name - Nome dell'attributo
     * @param {any} defaultValue - Valore di default se l'attributo non esiste
     * @returns {any}
     */
    getAttributeValue(name, defaultValue = null) {
        const attribute = this.getAttribute(name);
        return attribute ? attribute.getValue() : defaultValue;
    }

    /**
     * Imposta il valore di un attributo (shorthand)
     * @param {string} name - Nome dell'attributo
     * @param {any} value - Valore da impostare
     * @returns {boolean}
     */
    setAttributeValue(name, value) {
        const type = this.inferType(value);
        return this.setAttribute(name, value, type);
    }

    /**
     * Rimuove un attributo
     * @param {string} name - Nome dell'attributo
     * @returns {boolean}
     */
    removeAttribute(name) {
        if (this.attributes.has(name)) {
            const attribute = this.attributes.get(name);
            this.attributes.delete(name);
            this.updatedAt = new Date().toISOString();
            this.emit('attribute:removed', { entity: this, attribute });
            return true;
        }
        return false;
    }

    /**
     * Verifica se un attributo esiste
     * @param {string} name - Nome dell'attributo
     * @returns {boolean}
     */
    hasAttribute(name) {
        return this.attributes.has(name);
    }

    /**
     * Ottiene tutti i nomi degli attributi
     * @returns {string[]}
     */
    getAttributeNames() {
        return Array.from(this.attributes.keys());
    }

    /**
     * Ottiene tutti gli attributi
     * @returns {Attribute[]}
     */
    getAllAttributes() {
        return Array.from(this.attributes.values());
    }

    /**
     * Ottiene gli attributi filtrati per tipo
     * @param {string} type - Tipo di attributo
     * @returns {Attribute[]}
     */
    getAttributesByType(type) {
        return this.getAllAttributes().filter(attr => attr.type === type);
    }

    /**
     * Ottiene gli attributi richiesti (required)
     * @returns {Attribute[]}
     */
    getRequiredAttributes() {
        return this.getAllAttributes().filter(attr => attr.metadata.required);
    }

    /**
     * Ottiene gli attributi vuoti
     * @returns {Attribute[]}
     */
    getEmptyAttributes() {
        return this.getAllAttributes().filter(attr => attr.isEmpty());
    }

    /**
     * Valida tutti gli attributi dell'entità
     * @returns {object}
     */
    validate() {
        const errors = [];
        const warnings = [];

        for (const attribute of this.getAllAttributes()) {
            const validation = attribute.validate(attribute.value);
            if (!validation.isValid) {
                errors.push(...validation.errors);
            }
        }

        // Verifica attributi richiesti
        const requiredAttributes = this.getRequiredAttributes();
        for (const attr of requiredAttributes) {
            if (attr.isEmpty()) {
                errors.push(`${attr.name} è obbligatorio`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * Aggiorna i metadati dell'entità
     * @param {object} newMetadata - Nuovi metadati
     */
    updateMetadata(newMetadata) {
        this.metadata = { ...this.metadata, ...newMetadata };
        this.updatedAt = new Date().toISOString();
        this.emit('metadata:updated', { entity: this, metadata: this.metadata });
    }

    /**
     * Aggiunge un tag all'entità
     * @param {string} tag - Tag da aggiungere
     */
    addTag(tag) {
        if (!this.metadata.tags.includes(tag)) {
            this.metadata.tags.push(tag);
            this.updatedAt = new Date().toISOString();
            this.emit('tag:added', { entity: this, tag });
        }
    }

    /**
     * Rimuove un tag dall'entità
     * @param {string} tag - Tag da rimuovere
     */
    removeTag(tag) {
        const index = this.metadata.tags.indexOf(tag);
        if (index > -1) {
            this.metadata.tags.splice(index, 1);
            this.updatedAt = new Date().toISOString();
            this.emit('tag:removed', { entity: this, tag });
        }
    }

    /**
     * Verifica se l'entità ha un tag
     * @param {string} tag - Tag da verificare
     * @returns {boolean}
     */
    hasTag(tag) {
        return this.metadata.tags.includes(tag);
    }

    /**
     * Serializza l'entità per il salvataggio
     * @returns {object}
     */
    serialize() {
        const attributesData = {};
        for (const [name, attribute] of this.attributes) {
            attributesData[name] = attribute.serialize();
        }

        return {
            id: this.id,
            type: this.type,
            attributes: attributesData,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            schemaVersion: this.schemaVersion,
            metadata: { ...this.metadata }
        };
    }

    /**
     * Deserializza un'entità da dati salvati
     * @param {object} data - Dati serializzati
     * @returns {Entity}
     */
    static deserialize(data) {
        const entity = new Entity(data.type, data.id);
        entity.createdAt = data.createdAt;
        entity.updatedAt = data.updatedAt;
        entity.schemaVersion = data.schemaVersion || 1;
        entity.metadata = data.metadata || {};

        // Deserializza gli attributi
        if (data.attributes) {
            for (const [name, attrData] of Object.entries(data.attributes)) {
                const attribute = window.Attribute.deserialize(attrData);
                entity.attributes.set(name, attribute);
            }
        }

        return entity;
    }

    /**
     * Clona l'entità
     * @param {string} newId - Nuovo ID per il clone (opzionale)
     * @returns {Entity}
     */
    clone(newId = null) {
        const serialized = this.serialize();
        if (newId) {
            serialized.id = newId;
        } else {
            serialized.id = this.generateId();
        }
        serialized.createdAt = new Date().toISOString();
        serialized.updatedAt = new Date().toISOString();
        
        return Entity.deserialize(serialized);
    }

    /**
     * Confronta questa entità con un'altra
     * @param {Entity} other - Altra entità
     * @returns {object}
     */
    compare(other) {
        const differences = {
            attributes: {
                added: [],
                removed: [],
                changed: []
            },
            metadata: {}
        };

        // Confronta attributi
        const thisAttrs = new Set(this.getAttributeNames());
        const otherAttrs = new Set(other.getAttributeNames());

        // Attributi aggiunti
        for (const name of otherAttrs) {
            if (!thisAttrs.has(name)) {
                differences.attributes.added.push(name);
            }
        }

        // Attributi rimossi
        for (const name of thisAttrs) {
            if (!otherAttrs.has(name)) {
                differences.attributes.removed.push(name);
            }
        }

        // Attributi modificati
        for (const name of thisAttrs) {
            if (otherAttrs.has(name)) {
                const thisValue = this.getAttributeValue(name);
                const otherValue = other.getAttributeValue(name);
                if (JSON.stringify(thisValue) !== JSON.stringify(otherValue)) {
                    differences.attributes.changed.push({
                        name,
                        oldValue: thisValue,
                        newValue: otherValue
                    });
                }
            }
        }

        return differences;
    }

    /**
     * Applica le modifiche da un'altra entità
     * @param {Entity} other - Entità sorgente
     * @param {object} options - Opzioni per l'applicazione
     */
    applyChanges(other, options = {}) {
        const { 
            overwriteExisting = true, 
            addNew = true, 
            removeDeleted = false 
        } = options;

        if (addNew) {
            // Aggiungi nuovi attributi
            for (const [name, attribute] of other.attributes) {
                if (!this.hasAttribute(name)) {
                    this.setAttribute(name, attribute.value, attribute.type, attribute.metadata);
                }
            }
        }

        if (overwriteExisting) {
            // Aggiorna attributi esistenti
            for (const [name, attribute] of other.attributes) {
                if (this.hasAttribute(name)) {
                    this.setAttributeValue(name, attribute.value);
                }
            }
        }

        if (removeDeleted) {
            // Rimuovi attributi non presenti nell'altra entità
            const otherAttrNames = new Set(other.getAttributeNames());
            for (const name of this.getAttributeNames()) {
                if (!otherAttrNames.has(name)) {
                    this.removeAttribute(name);
                }
            }
        }

        // Aggiorna metadati
        this.updateMetadata(other.metadata);
    }

    /**
     * Sistema di eventi semplice
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        console.log(`[Entity ${this.id}] Emissione evento:`, event, data);
        
        if (this.eventListeners.has(event)) {
            console.log(`[Entity ${this.id}] Notifica ${this.eventListeners.get(event).size} listener per evento:`, event);
            for (const callback of this.eventListeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Errore nell'evento ${event}:`, error);
                }
            }
        } else {
            console.log(`[Entity ${this.id}] Nessun listener per evento:`, event);
        }

        // Emit anche a livello globale
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent(`entity:${event}`, {
                detail: { ...data, entityId: this.id }
            }));
        }
    }

    /**
     * Ottiene una rappresentazione stringa dell'entità
     * @returns {string}
     */
    toString() {
        const attrCount = this.attributes.size;
        return `Entity(${this.type}#${this.id}, ${attrCount} attributes)`;
    }

    /**
     * Ottiene statistiche sull'entità
     * @returns {object}
     */
    getStats() {
        const attributes = this.getAllAttributes();
        const typeDistribution = {};
        
        for (const attr of attributes) {
            typeDistribution[attr.type] = (typeDistribution[attr.type] || 0) + 1;
        }

        return {
            id: this.id,
            type: this.type,
            attributeCount: attributes.length,
            typeDistribution: typeDistribution,
            requiredCount: this.getRequiredAttributes().length,
            emptyCount: this.getEmptyAttributes().length,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            tags: this.metadata.tags
        };
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.Entity = Entity;
} 