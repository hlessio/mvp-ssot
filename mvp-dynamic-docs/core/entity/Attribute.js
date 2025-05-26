/**
 * Attribute - Rappresenta un singolo attributo di un'entità
 * Gestisce validazione, serializzazione e metadati dell'attributo
 */
class Attribute {
    constructor(name, value = null, type = 'text', metadata = {}) {
        this.name = name;
        this.value = value;
        this.type = type;
        this.metadata = {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'user', // 'user', 'module', 'system'
            required: false,
            editable: true,
            ...metadata
        };
        this.validators = [];
        this.transformers = [];
        
        this.setupDefaultValidators();
    }

    /**
     * Imposta il valore dell'attributo con validazione
     * @param {any} newValue - Nuovo valore
     * @param {object} options - Opzioni per il set
     * @returns {boolean} - True se il valore è stato impostato
     */
    setValue(newValue, options = {}) {
        const oldValue = this.value;
        
        try {
            // Trasforma il valore se necessario
            const transformedValue = this.transform(newValue);
            
            // Valida il nuovo valore
            const validationResult = this.validate(transformedValue);
            if (!validationResult.isValid) {
                if (options.throwOnError) {
                    throw new Error(`Validazione fallita: ${validationResult.errors.join(', ')}`);
                }
                console.warn(`Validazione fallita per ${this.name}:`, validationResult.errors);
                return false;
            }

            // Imposta il nuovo valore
            this.value = transformedValue;
            this.metadata.updatedAt = new Date().toISOString();
            
            // Notifica il cambiamento se richiesto
            if (options.notify !== false) {
                this.notifyChange(oldValue, transformedValue);
            }

            return true;
        } catch (error) {
            console.error(`Errore nell'impostazione del valore per ${this.name}:`, error);
            if (options.throwOnError) {
                throw error;
            }
            return false;
        }
    }

    /**
     * Ottiene il valore dell'attributo
     * @param {object} options - Opzioni per il get
     * @returns {any}
     */
    getValue(options = {}) {
        if (options.raw) {
            return this.value;
        }

        // Applica trasformazioni per la visualizzazione se necessarie
        return this.transformForDisplay(this.value);
    }

    /**
     * Valida il valore dell'attributo
     * @param {any} value - Valore da validare
     * @returns {object} - Risultato della validazione
     */
    validate(value) {
        const errors = [];

        // Validazione required
        if (this.metadata.required && (value === null || value === undefined || value === '')) {
            errors.push(`${this.name} è obbligatorio`);
        }

        // Validazione tipo
        const typeValidation = this.validateType(value);
        if (!typeValidation.isValid) {
            errors.push(...typeValidation.errors);
        }

        // Validatori personalizzati
        for (const validator of this.validators) {
            try {
                const result = validator(value, this);
                if (result !== true) {
                    errors.push(typeof result === 'string' ? result : `Validazione fallita per ${this.name}`);
                }
            } catch (error) {
                errors.push(`Errore di validazione: ${error.message}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Valida il tipo del valore
     * @param {any} value - Valore da validare
     * @returns {object}
     */
    validateType(value) {
        if (value === null || value === undefined) {
            return { isValid: true, errors: [] };
        }

        const errors = [];

        switch (this.type) {
            case 'text':
            case 'string':
                if (typeof value !== 'string') {
                    errors.push(`${this.name} deve essere una stringa`);
                }
                break;

            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    errors.push(`${this.name} deve essere un numero valido`);
                }
                break;

            case 'integer':
                if (!Number.isInteger(value)) {
                    errors.push(`${this.name} deve essere un numero intero`);
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push(`${this.name} deve essere true o false`);
                }
                break;

            case 'email':
                if (typeof value !== 'string' || !this.isValidEmail(value)) {
                    errors.push(`${this.name} deve essere un'email valida`);
                }
                break;

            case 'url':
                if (typeof value !== 'string' || !this.isValidUrl(value)) {
                    errors.push(`${this.name} deve essere un URL valido`);
                }
                break;

            case 'date':
                if (!(value instanceof Date) && !this.isValidDateString(value)) {
                    errors.push(`${this.name} deve essere una data valida`);
                }
                break;

            case 'array':
                if (!Array.isArray(value)) {
                    errors.push(`${this.name} deve essere un array`);
                }
                break;

            case 'object':
                if (typeof value !== 'object' || Array.isArray(value)) {
                    errors.push(`${this.name} deve essere un oggetto`);
                }
                break;

            default:
                // Tipo personalizzato - nessuna validazione di default
                break;
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Trasforma il valore prima dell'impostazione
     * @param {any} value - Valore da trasformare
     * @returns {any}
     */
    transform(value) {
        let transformedValue = value;

        // Trasformazioni di tipo
        switch (this.type) {
            case 'number':
            case 'integer':
                if (typeof value === 'string' && value.trim() !== '') {
                    const parsed = this.type === 'integer' ? parseInt(value, 10) : parseFloat(value);
                    if (!isNaN(parsed)) {
                        transformedValue = parsed;
                    }
                }
                break;

            case 'boolean':
                if (typeof value === 'string') {
                    transformedValue = value.toLowerCase() === 'true' || value === '1';
                }
                break;

            case 'date':
                if (typeof value === 'string') {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        transformedValue = date;
                    }
                }
                break;

            case 'text':
            case 'string':
            case 'email':
            case 'url':
                if (value !== null && value !== undefined) {
                    transformedValue = String(value).trim();
                }
                break;
        }

        // Trasformatori personalizzati
        for (const transformer of this.transformers) {
            try {
                transformedValue = transformer(transformedValue, this);
            } catch (error) {
                console.warn(`Errore nel trasformatore per ${this.name}:`, error);
            }
        }

        return transformedValue;
    }

    /**
     * Trasforma il valore per la visualizzazione
     * @param {any} value - Valore da trasformare
     * @returns {any}
     */
    transformForDisplay(value) {
        if (value === null || value === undefined) {
            return '';
        }

        switch (this.type) {
            case 'date':
                if (value instanceof Date) {
                    return value.toLocaleDateString();
                }
                break;

            case 'boolean':
                return value ? 'Sì' : 'No';

            case 'array':
                return Array.isArray(value) ? value.join(', ') : String(value);

            default:
                return value;
        }
    }

    /**
     * Aggiunge un validatore personalizzato
     * @param {Function} validator - Funzione di validazione
     */
    addValidator(validator) {
        if (typeof validator === 'function') {
            this.validators.push(validator);
        }
    }

    /**
     * Aggiunge un trasformatore personalizzato
     * @param {Function} transformer - Funzione di trasformazione
     */
    addTransformer(transformer) {
        if (typeof transformer === 'function') {
            this.transformers.push(transformer);
        }
    }

    /**
     * Setup dei validatori di default
     */
    setupDefaultValidators() {
        // Validatore per lunghezza massima
        if (this.metadata.maxLength) {
            this.addValidator((value) => {
                if (typeof value === 'string' && value.length > this.metadata.maxLength) {
                    return `${this.name} non può superare ${this.metadata.maxLength} caratteri`;
                }
                return true;
            });
        }

        // Validatore per lunghezza minima
        if (this.metadata.minLength) {
            this.addValidator((value) => {
                if (typeof value === 'string' && value.length < this.metadata.minLength) {
                    return `${this.name} deve avere almeno ${this.metadata.minLength} caratteri`;
                }
                return true;
            });
        }

        // Validatore per valore minimo (numeri)
        if (this.metadata.min !== undefined) {
            this.addValidator((value) => {
                if (typeof value === 'number' && value < this.metadata.min) {
                    return `${this.name} deve essere almeno ${this.metadata.min}`;
                }
                return true;
            });
        }

        // Validatore per valore massimo (numeri)
        if (this.metadata.max !== undefined) {
            this.addValidator((value) => {
                if (typeof value === 'number' && value > this.metadata.max) {
                    return `${this.name} non può superare ${this.metadata.max}`;
                }
                return true;
            });
        }

        // Validatore per pattern regex
        if (this.metadata.pattern) {
            this.addValidator((value) => {
                if (typeof value === 'string' && !this.metadata.pattern.test(value)) {
                    return `${this.name} non rispetta il formato richiesto`;
                }
                return true;
            });
        }
    }

    /**
     * Verifica se una stringa è un'email valida
     * @param {string} email - Email da verificare
     * @returns {boolean}
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Verifica se una stringa è un URL valido
     * @param {string} url - URL da verificare
     * @returns {boolean}
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Verifica se una stringa è una data valida
     * @param {string} dateString - Stringa data da verificare
     * @returns {boolean}
     */
    isValidDateString(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    /**
     * Notifica il cambiamento del valore
     * @param {any} oldValue - Valore precedente
     * @param {any} newValue - Nuovo valore
     */
    notifyChange(oldValue, newValue) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('attribute:change', {
                detail: {
                    attribute: this,
                    oldValue: oldValue,
                    newValue: newValue,
                    timestamp: new Date().toISOString()
                }
            }));
        }
    }

    /**
     * Serializza l'attributo per il salvataggio
     * @returns {object}
     */
    serialize() {
        return {
            name: this.name,
            value: this.value,
            type: this.type,
            metadata: { ...this.metadata }
        };
    }

    /**
     * Deserializza un attributo da dati salvati
     * @param {object} data - Dati serializzati
     * @returns {Attribute}
     */
    static deserialize(data) {
        const attribute = new Attribute(data.name, data.value, data.type, data.metadata);
        return attribute;
    }

    /**
     * Clona l'attributo
     * @returns {Attribute}
     */
    clone() {
        return Attribute.deserialize(this.serialize());
    }

    /**
     * Ottiene una rappresentazione stringa dell'attributo
     * @returns {string}
     */
    toString() {
        return `Attribute(${this.name}: ${this.type} = ${this.value})`;
    }

    /**
     * Verifica se l'attributo è vuoto
     * @returns {boolean}
     */
    isEmpty() {
        return this.value === null || this.value === undefined || this.value === '';
    }

    /**
     * Reimposta l'attributo al valore di default
     */
    reset() {
        const defaultValue = this.metadata.defaultValue !== undefined ? 
            this.metadata.defaultValue : this.getTypeDefaultValue();
        
        this.setValue(defaultValue, { notify: true });
    }

    /**
     * Ottiene il valore di default per il tipo
     * @returns {any}
     */
    getTypeDefaultValue() {
        switch (this.type) {
            case 'text':
            case 'string':
            case 'email':
            case 'url':
                return '';
            case 'number':
            case 'integer':
                return 0;
            case 'boolean':
                return false;
            case 'array':
                return [];
            case 'object':
                return {};
            case 'date':
                return new Date();
            default:
                return null;
        }
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.Attribute = Attribute;
} 