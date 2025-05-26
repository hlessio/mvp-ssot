/**
 * ModuleDefinition - Parser e validatore per file mod.json
 * Gestisce la definizione strutturale dei moduli e la validazione
 */
class ModuleDefinition {
    constructor(moduleData = {}) {
        this.moduleId = moduleData.module_id || '';
        this.version = moduleData.version || '1.0.0';
        this.name = moduleData.name || this.moduleId;
        this.description = moduleData.description || '';
        this.author = moduleData.author || '';
        this.tags = moduleData.tags || [];
        
        this.slots = new Map();
        this.layout = moduleData.layout || {};
        this.styling = moduleData.styling || {};
        this.behavior = moduleData.behavior || {};
        this.dependencies = moduleData.dependencies || [];
        
        this.metadata = {
            createdAt: moduleData.created_at || new Date().toISOString(),
            updatedAt: moduleData.updated_at || new Date().toISOString(),
            ...moduleData.metadata
        };

        this.validationErrors = [];
        this.validationWarnings = [];

        if (moduleData.slots) {
            this.parseSlots(moduleData.slots);
        }

        this.validate();
    }

    /**
     * Parsa le definizioni degli slot
     * @param {object} slotsData - Dati degli slot dal JSON
     */
    parseSlots(slotsData) {
        for (const [slotName, slotConfig] of Object.entries(slotsData)) {
            const slot = new SlotDefinition(slotName, slotConfig);
            this.slots.set(slotName, slot);
        }
    }

    /**
     * Valida la definizione del modulo
     * @returns {object} - Risultato della validazione
     */
    validate() {
        this.validationErrors = [];
        this.validationWarnings = [];

        // Validazione campi obbligatori
        if (!this.moduleId) {
            this.validationErrors.push('module_id è obbligatorio');
        }

        if (!this.version) {
            this.validationErrors.push('version è obbligatoria');
        }

        // Validazione formato version (semantic versioning)
        if (this.version && !this.isValidVersion(this.version)) {
            this.validationErrors.push('version deve seguire il formato semantic versioning (x.y.z)');
        }

        // Validazione moduleId formato
        if (this.moduleId && !this.isValidModuleId(this.moduleId)) {
            this.validationErrors.push('module_id deve contenere solo lettere, numeri e trattini');
        }

        // Validazione slots
        if (this.slots.size === 0) {
            this.validationWarnings.push('Il modulo non ha slot definiti');
        }

        for (const [slotName, slot] of this.slots) {
            const slotValidation = slot.validate();
            if (!slotValidation.isValid) {
                this.validationErrors.push(...slotValidation.errors.map(err => `Slot '${slotName}': ${err}`));
            }
            if (slotValidation.warnings.length > 0) {
                this.validationWarnings.push(...slotValidation.warnings.map(warn => `Slot '${slotName}': ${warn}`));
            }
        }

        // Validazione layout
        const layoutValidation = this.validateLayout();
        if (!layoutValidation.isValid) {
            this.validationErrors.push(...layoutValidation.errors);
        }

        // Validazione styling
        const stylingValidation = this.validateStyling();
        if (!stylingValidation.isValid) {
            this.validationErrors.push(...stylingValidation.errors);
        }

        // Validazione dipendenze
        const dependenciesValidation = this.validateDependencies();
        if (!dependenciesValidation.isValid) {
            this.validationErrors.push(...dependenciesValidation.errors);
        }

        return {
            isValid: this.validationErrors.length === 0,
            errors: this.validationErrors,
            warnings: this.validationWarnings
        };
    }

    /**
     * Valida il layout del modulo
     * @returns {object}
     */
    validateLayout() {
        const errors = [];

        if (!this.layout.type) {
            errors.push('Layout deve avere un tipo specificato');
        }

        const validLayoutTypes = ['card', 'list', 'table', 'form', 'grid', 'custom'];
        if (this.layout.type && !validLayoutTypes.includes(this.layout.type)) {
            errors.push(`Tipo di layout '${this.layout.type}' non valido. Tipi supportati: ${validLayoutTypes.join(', ')}`);
        }

        if (!this.layout.elements || !Array.isArray(this.layout.elements)) {
            errors.push('Layout deve avere un array di elementi');
        } else {
            // Valida ogni elemento del layout
            for (let i = 0; i < this.layout.elements.length; i++) {
                const element = this.layout.elements[i];
                const elementErrors = this.validateLayoutElement(element, i);
                errors.push(...elementErrors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Valida un singolo elemento del layout
     * @param {object} element - Elemento da validare
     * @param {number} index - Indice dell'elemento
     * @returns {string[]}
     */
    validateLayoutElement(element, index) {
        const errors = [];

        if (!element.element) {
            errors.push(`Elemento ${index}: 'element' è obbligatorio`);
        }

        const validElements = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'input', 'textarea', 'select', 'button', 'img', 'a'];
        if (element.element && !validElements.includes(element.element)) {
            errors.push(`Elemento ${index}: tipo '${element.element}' non supportato`);
        }

        // Se l'elemento ha uno slot, verifica che esista
        if (element.slot && !this.slots.has(element.slot)) {
            errors.push(`Elemento ${index}: slot '${element.slot}' non definito`);
        }

        // Valida attributi specifici per tipo di elemento
        if (element.element === 'input' && (!element.attributes || !element.attributes.type)) {
            errors.push(`Elemento ${index}: input deve avere un tipo specificato negli attributi`);
        }

        return errors;
    }

    /**
     * Valida lo styling del modulo
     * @returns {object}
     */
    validateStyling() {
        const errors = [];

        if (this.styling.theme) {
            const validThemes = ['minimal', 'modern', 'classic', 'dark', 'light'];
            if (!validThemes.includes(this.styling.theme)) {
                errors.push(`Tema '${this.styling.theme}' non valido. Temi supportati: ${validThemes.join(', ')}`);
            }
        }

        if (this.styling.spacing) {
            const validSpacing = ['compact', 'normal', 'relaxed'];
            if (!validSpacing.includes(this.styling.spacing)) {
                errors.push(`Spacing '${this.styling.spacing}' non valido. Valori supportati: ${validSpacing.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Valida le dipendenze del modulo
     * @returns {object}
     */
    validateDependencies() {
        const errors = [];

        if (!Array.isArray(this.dependencies)) {
            errors.push('Dependencies deve essere un array');
            return { isValid: false, errors: errors };
        }

        for (let i = 0; i < this.dependencies.length; i++) {
            const dep = this.dependencies[i];
            
            if (typeof dep === 'string') {
                // Dipendenza semplice (solo nome)
                if (!this.isValidModuleId(dep)) {
                    errors.push(`Dipendenza ${i}: '${dep}' non è un ID modulo valido`);
                }
            } else if (typeof dep === 'object') {
                // Dipendenza con versione
                if (!dep.module_id) {
                    errors.push(`Dipendenza ${i}: module_id è obbligatorio`);
                }
                if (!dep.version) {
                    errors.push(`Dipendenza ${i}: version è obbligatoria`);
                }
                if (dep.version && !this.isValidVersionRange(dep.version)) {
                    errors.push(`Dipendenza ${i}: formato versione '${dep.version}' non valido`);
                }
            } else {
                errors.push(`Dipendenza ${i}: formato non valido`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Verifica se un module_id è valido
     * @param {string} moduleId - ID del modulo
     * @returns {boolean}
     */
    isValidModuleId(moduleId) {
        return /^[a-z0-9-]+$/.test(moduleId);
    }

    /**
     * Verifica se una versione è valida (semantic versioning)
     * @param {string} version - Versione da verificare
     * @returns {boolean}
     */
    isValidVersion(version) {
        return /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/.test(version);
    }

    /**
     * Verifica se un range di versioni è valido
     * @param {string} versionRange - Range di versioni
     * @returns {boolean}
     */
    isValidVersionRange(versionRange) {
        // Supporta: "1.0.0", "^1.0.0", "~1.0.0", ">=1.0.0", "1.0.0 - 2.0.0"
        const patterns = [
            /^\d+\.\d+\.\d+$/, // Versione esatta
            /^\^?\d+\.\d+\.\d+$/, // Caret range
            /^~\d+\.\d+\.\d+$/, // Tilde range
            /^>=?\d+\.\d+\.\d+$/, // Greater than
            /^<=?\d+\.\d+\.\d+$/, // Less than
            /^\d+\.\d+\.\d+ - \d+\.\d+\.\d+$/ // Range
        ];

        return patterns.some(pattern => pattern.test(versionRange));
    }

    /**
     * Ottiene tutti gli attributi richiesti dal modulo
     * @returns {string[]}
     */
    getRequiredAttributes() {
        const attributes = new Set();
        
        for (const slot of this.slots.values()) {
            if (slot.path) {
                // Estrae il nome dell'attributo dal path (es: "Cliente.nome" -> "nome")
                const attributeName = slot.path.split('.').pop();
                attributes.add(attributeName);
            }
        }

        return Array.from(attributes);
    }

    /**
     * Ottiene tutti i tipi di entità supportati dal modulo
     * @returns {string[]}
     */
    getSupportedEntityTypes() {
        const entityTypes = new Set();
        
        for (const slot of this.slots.values()) {
            if (slot.path) {
                // Estrae il tipo di entità dal path (es: "Cliente.nome" -> "Cliente")
                const entityType = slot.path.split('.')[0];
                entityTypes.add(entityType);
            }
        }

        return Array.from(entityTypes);
    }

    /**
     * Verifica se il modulo è compatibile con un'entità
     * @param {Entity} entity - Entità da verificare
     * @returns {object}
     */
    isCompatibleWith(entity) {
        const supportedTypes = this.getSupportedEntityTypes();
        const requiredAttributes = this.getRequiredAttributes();
        
        const isTypeCompatible = supportedTypes.length === 0 || supportedTypes.includes(entity.type);
        const missingAttributes = requiredAttributes.filter(attr => !entity.hasAttribute(attr));
        
        return {
            isCompatible: isTypeCompatible && missingAttributes.length === 0,
            typeCompatible: isTypeCompatible,
            missingAttributes: missingAttributes,
            supportedTypes: supportedTypes,
            requiredAttributes: requiredAttributes
        };
    }

    /**
     * Serializza la definizione del modulo
     * @returns {object}
     */
    serialize() {
        const slotsData = {};
        for (const [slotName, slot] of this.slots) {
            slotsData[slotName] = slot.serialize();
        }

        return {
            module_id: this.moduleId,
            version: this.version,
            name: this.name,
            description: this.description,
            author: this.author,
            tags: [...this.tags],
            slots: slotsData,
            layout: { ...this.layout },
            styling: { ...this.styling },
            behavior: { ...this.behavior },
            dependencies: [...this.dependencies],
            metadata: { ...this.metadata }
        };
    }

    /**
     * Deserializza una definizione del modulo
     * @param {object} data - Dati serializzati
     * @returns {ModuleDefinition}
     */
    static deserialize(data) {
        return new ModuleDefinition(data);
    }

    /**
     * Carica una definizione da JSON string
     * @param {string} jsonString - JSON string
     * @returns {ModuleDefinition}
     */
    static fromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return new ModuleDefinition(data);
        } catch (error) {
            throw new Error(`Errore nel parsing JSON: ${error.message}`);
        }
    }

    /**
     * Converte in JSON string
     * @returns {string}
     */
    toJSON() {
        return JSON.stringify(this.serialize(), null, 2);
    }

    /**
     * Clona la definizione del modulo
     * @returns {ModuleDefinition}
     */
    clone() {
        return ModuleDefinition.deserialize(this.serialize());
    }

    /**
     * Ottiene informazioni di debug
     * @returns {object}
     */
    getDebugInfo() {
        return {
            moduleId: this.moduleId,
            version: this.version,
            slotsCount: this.slots.size,
            validation: this.validate(),
            requiredAttributes: this.getRequiredAttributes(),
            supportedEntityTypes: this.getSupportedEntityTypes(),
            dependencies: this.dependencies
        };
    }
}

/**
 * SlotDefinition - Definizione di un singolo slot del modulo
 */
class SlotDefinition {
    constructor(name, config = {}) {
        this.name = name;
        this.path = config.path || '';
        this.type = config.type || 'text';
        this.editable = config.editable !== false; // Default true
        this.required = config.required || false;
        this.defaultValue = config.default_value;
        this.placeholder = config.placeholder || '';
        this.label = config.label || name;
        this.description = config.description || '';
        this.validation = config.validation || {};
        this.options = config.options || []; // Per select, radio, etc.
        this.metadata = config.metadata || {};
    }

    /**
     * Valida la definizione dello slot
     * @returns {object}
     */
    validate() {
        const errors = [];
        const warnings = [];

        if (!this.name) {
            errors.push('Nome slot è obbligatorio');
        }

        if (!this.path) {
            warnings.push('Path non specificato - lo slot potrebbe non essere collegato a dati');
        }

        // Valida il path format (EntityType.attributeName)
        if (this.path && !this.isValidPath(this.path)) {
            errors.push(`Path '${this.path}' non valido. Formato atteso: EntityType.attributeName`);
        }

        // Valida il tipo
        const validTypes = ['text', 'number', 'integer', 'boolean', 'email', 'url', 'date', 'select', 'textarea', 'password'];
        if (!validTypes.includes(this.type)) {
            errors.push(`Tipo '${this.type}' non valido. Tipi supportati: ${validTypes.join(', ')}`);
        }

        // Valida opzioni per select
        if (this.type === 'select' && (!this.options || this.options.length === 0)) {
            errors.push('Slot di tipo select deve avere opzioni definite');
        }

        // Valida validazione
        if (this.validation) {
            const validationErrors = this.validateValidationRules();
            errors.push(...validationErrors);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * Verifica se un path è valido
     * @param {string} path - Path da verificare
     * @returns {boolean}
     */
    isValidPath(path) {
        return /^[A-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9_]*$/.test(path);
    }

    /**
     * Valida le regole di validazione
     * @returns {string[]}
     */
    validateValidationRules() {
        const errors = [];

        if (this.validation.min !== undefined && typeof this.validation.min !== 'number') {
            errors.push('Regola validazione min deve essere un numero');
        }

        if (this.validation.max !== undefined && typeof this.validation.max !== 'number') {
            errors.push('Regola validazione max deve essere un numero');
        }

        if (this.validation.minLength !== undefined && typeof this.validation.minLength !== 'number') {
            errors.push('Regola validazione minLength deve essere un numero');
        }

        if (this.validation.maxLength !== undefined && typeof this.validation.maxLength !== 'number') {
            errors.push('Regola validazione maxLength deve essere un numero');
        }

        if (this.validation.pattern !== undefined && typeof this.validation.pattern !== 'string') {
            errors.push('Regola validazione pattern deve essere una stringa');
        }

        return errors;
    }

    /**
     * Ottiene il tipo di entità dal path
     * @returns {string|null}
     */
    getEntityType() {
        if (!this.path) return null;
        return this.path.split('.')[0];
    }

    /**
     * Ottiene il nome dell'attributo dal path
     * @returns {string|null}
     */
    getAttributeName() {
        if (!this.path) return null;
        return this.path.split('.').pop();
    }

    /**
     * Serializza lo slot
     * @returns {object}
     */
    serialize() {
        return {
            path: this.path,
            type: this.type,
            editable: this.editable,
            required: this.required,
            default_value: this.defaultValue,
            placeholder: this.placeholder,
            label: this.label,
            description: this.description,
            validation: { ...this.validation },
            options: [...this.options],
            metadata: { ...this.metadata }
        };
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.ModuleDefinition = ModuleDefinition;
}
// Classi già disponibili globalmente 