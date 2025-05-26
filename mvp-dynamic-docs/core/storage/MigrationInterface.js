/**
 * MigrationInterface - Astrazione per future migrazioni database
 * Fornisce un'interfaccia standardizzata per export/import e migrazione
 * verso sistemi di storage più avanzati (IndexedDB, SQLite, PostgreSQL)
 */
class MigrationInterface {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.currentVersion = 1;
        this.migrationHandlers = new Map();
        this.setupDefaultMigrations();
    }

    /**
     * Registra un handler di migrazione per una versione specifica
     * @param {number} fromVersion - Versione di partenza
     * @param {number} toVersion - Versione di destinazione
     * @param {Function} handler - Funzione di migrazione
     */
    registerMigration(fromVersion, toVersion, handler) {
        const key = `${fromVersion}->${toVersion}`;
        this.migrationHandlers.set(key, handler);
    }

    /**
     * Esporta tutti i dati in formato standardizzato
     * @returns {Promise<object>}
     */
    async export() {
        try {
            const data = await this.storageManager.export();
            
            return {
                ...data,
                metadata: {
                    exportedAt: new Date().toISOString(),
                    platform: 'localStorage',
                    version: this.currentVersion,
                    schema: await this.getSchema()
                }
            };
        } catch (error) {
            console.error('Errore durante l\'export:', error);
            throw new Error(`Export fallito: ${error.message}`);
        }
    }

    /**
     * Importa dati da formato standardizzato
     * @param {object} exportData - Dati esportati
     * @param {object} options - Opzioni di importazione
     * @returns {Promise<void>}
     */
    async import(exportData, options = {}) {
        try {
            // Validazione formato
            this.validateExportFormat(exportData);

            // Migrazione se necessaria
            const migratedData = await this.migrateIfNeeded(exportData);

            // Backup corrente se richiesto
            if (options.createBackup) {
                await this.createBackup();
            }

            // Importazione
            if (options.clearExisting) {
                await this.storageManager.clear();
            }

            await this.storageManager.import(migratedData);

            console.log('Import completato con successo');
        } catch (error) {
            console.error('Errore durante l\'import:', error);
            throw new Error(`Import fallito: ${error.message}`);
        }
    }

    /**
     * Ottiene lo schema corrente dei dati
     * @returns {Promise<object>}
     */
    async getSchema() {
        const stats = this.storageManager.getStats();
        const sampleData = {};

        // Analizza un campione di ogni tipo per dedurre lo schema
        for (const [type, count] of Object.entries(stats.typeDistribution)) {
            if (count > 0) {
                const samples = await this.storageManager.query({ type });
                if (samples.length > 0) {
                    sampleData[type] = this.analyzeStructure(samples[0].data);
                }
            }
        }

        return {
            version: this.currentVersion,
            types: sampleData,
            statistics: stats
        };
    }

    /**
     * Migra dati da una versione all'altra
     * @param {number} fromVersion - Versione di partenza
     * @param {number} toVersion - Versione di destinazione
     * @param {object} data - Dati da migrare
     * @returns {Promise<object>}
     */
    async migrate(fromVersion, toVersion, data) {
        if (fromVersion === toVersion) {
            return data;
        }

        let currentData = data;
        let currentVersion = fromVersion;

        // Esegui migrazioni sequenziali
        while (currentVersion < toVersion) {
            const nextVersion = currentVersion + 1;
            const migrationKey = `${currentVersion}->${nextVersion}`;
            
            if (this.migrationHandlers.has(migrationKey)) {
                const handler = this.migrationHandlers.get(migrationKey);
                currentData = await handler(currentData);
                currentVersion = nextVersion;
                
                console.log(`Migrazione ${migrationKey} completata`);
            } else {
                throw new Error(`Migrazione non disponibile: ${migrationKey}`);
            }
        }

        return currentData;
    }

    /**
     * Valida il formato dei dati esportati
     * @param {object} exportData - Dati da validare
     */
    validateExportFormat(exportData) {
        if (!exportData || typeof exportData !== 'object') {
            throw new Error('Formato export non valido: deve essere un oggetto');
        }

        if (!exportData.data) {
            throw new Error('Formato export non valido: manca la proprietà data');
        }

        if (!exportData.version) {
            throw new Error('Formato export non valido: manca la versione');
        }

        if (!exportData.timestamp) {
            throw new Error('Formato export non valido: manca il timestamp');
        }
    }

    /**
     * Migra i dati se necessario
     * @param {object} exportData - Dati esportati
     * @returns {Promise<object>}
     */
    async migrateIfNeeded(exportData) {
        const sourceVersion = exportData.version;
        
        if (sourceVersion === this.currentVersion) {
            return exportData;
        }

        if (sourceVersion > this.currentVersion) {
            throw new Error(`Versione non supportata: ${sourceVersion} > ${this.currentVersion}`);
        }

        console.log(`Migrazione necessaria: v${sourceVersion} -> v${this.currentVersion}`);
        
        return await this.migrate(sourceVersion, this.currentVersion, exportData);
    }

    /**
     * Crea un backup dei dati correnti
     * @returns {Promise<string>}
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `backup_${timestamp}`;
        
        const exportData = await this.export();
        await this.storageManager.save(backupKey, exportData);
        
        console.log(`Backup creato: ${backupKey}`);
        return backupKey;
    }

    /**
     * Analizza la struttura di un oggetto per dedurre lo schema
     * @param {object} obj - Oggetto da analizzare
     * @returns {object}
     */
    analyzeStructure(obj) {
        const structure = {};
        
        for (const [key, value] of Object.entries(obj)) {
            structure[key] = {
                type: this.getValueType(value),
                required: value !== null && value !== undefined,
                example: value
            };
        }

        return structure;
    }

    /**
     * Determina il tipo di un valore
     * @param {any} value - Valore da analizzare
     * @returns {string}
     */
    getValueType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (value instanceof Date) return 'date';
        return typeof value;
    }

    /**
     * Setup delle migrazioni di default
     */
    setupDefaultMigrations() {
        // Migrazione esempio: v1 -> v2 (aggiunta campo updatedAt)
        this.registerMigration(1, 2, async (data) => {
            const migratedData = { ...data };
            
            // Aggiungi updatedAt a tutte le entità
            for (const [key, entityData] of Object.entries(migratedData.data)) {
                if (entityData && entityData.type) {
                    entityData.updatedAt = entityData.createdAt || new Date().toISOString();
                }
            }

            migratedData.version = 2;
            return migratedData;
        });
    }

    /**
     * Prepara i dati per migrazione verso IndexedDB
     * @returns {Promise<object>}
     */
    async prepareForIndexedDB() {
        const exportData = await this.export();
        
        return {
            ...exportData,
            targetPlatform: 'indexeddb',
            migrationInstructions: {
                stores: ['entities', 'attributes', 'modules', 'documents'],
                indexes: [
                    { store: 'entities', field: 'type' },
                    { store: 'entities', field: 'createdAt' },
                    { store: 'attributes', field: 'entityId' }
                ]
            }
        };
    }

    /**
     * Prepara i dati per migrazione verso database SQL
     * @returns {Promise<object>}
     */
    async prepareForSQL() {
        const exportData = await this.export();
        const schema = await this.getSchema();
        
        return {
            ...exportData,
            targetPlatform: 'sql',
            sqlSchema: this.generateSQLSchema(schema),
            migrationInstructions: {
                tables: ['entities', 'attributes', 'entity_attributes', 'modules', 'documents'],
                relationships: [
                    { from: 'entity_attributes', to: 'entities', field: 'entity_id' },
                    { from: 'entity_attributes', to: 'attributes', field: 'attribute_id' }
                ]
            }
        };
    }

    /**
     * Genera schema SQL dai dati correnti
     * @param {object} schema - Schema dei dati
     * @returns {string}
     */
    generateSQLSchema(schema) {
        let sql = '';
        
        // Tabella entità
        sql += `
CREATE TABLE entities (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    schema_version INTEGER DEFAULT 1,
    data JSONB
);

CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_created_at ON entities(created_at);
`;

        // Tabella attributi
        sql += `
CREATE TABLE attributes (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    metadata JSONB
);

CREATE TABLE entity_attributes (
    entity_id VARCHAR(255) REFERENCES entities(id),
    attribute_id VARCHAR(255) REFERENCES attributes(id),
    value JSONB,
    PRIMARY KEY (entity_id, attribute_id)
);
`;

        return sql.trim();
    }

    /**
     * Ottiene informazioni sulle migrazioni disponibili
     * @returns {object}
     */
    getMigrationInfo() {
        return {
            currentVersion: this.currentVersion,
            availableMigrations: Array.from(this.migrationHandlers.keys()),
            supportedPlatforms: ['localStorage', 'indexeddb', 'sql']
        };
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.MigrationInterface = MigrationInterface;
} 