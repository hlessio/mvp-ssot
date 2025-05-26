/**
 * StorageManager - Gestione persistenza con LocalStorage
 * Fornisce un'interfaccia unificata per il salvataggio dei dati
 * con supporto per transazioni e query semplici
 */
class StorageManager {
    constructor() {
        this.prefix = 'mvp_dynamic_docs_';
        this.indexes = new Map(); // Cache per performance
        this.init();
    }

    /**
     * Inizializza il storage manager e carica gli indici
     */
    init() {
        this.loadIndexes();
    }

    /**
     * Salva dati nel localStorage
     * @param {string} key - Chiave di storage
     * @param {any} data - Dati da salvare
     * @returns {Promise<void>}
     */
    async save(key, data) {
        try {
            const fullKey = this.prefix + key;
            const serializedData = JSON.stringify({
                data: data,
                timestamp: Date.now(),
                version: 1
            });
            
            localStorage.setItem(fullKey, serializedData);
            this.updateIndex(key, data);
            
            // Emit evento per notificare il salvataggio
            this.emit('storage:save', { key, data });
        } catch (error) {
            console.error('Errore nel salvataggio:', error);
            throw new Error(`Impossibile salvare ${key}: ${error.message}`);
        }
    }

    /**
     * Carica dati dal localStorage
     * @param {string} key - Chiave di storage
     * @returns {Promise<any>}
     */
    async load(key) {
        try {
            const fullKey = this.prefix + key;
            const serializedData = localStorage.getItem(fullKey);
            
            if (!serializedData) {
                return null;
            }

            const parsed = JSON.parse(serializedData);
            return parsed.data;
        } catch (error) {
            console.error('Errore nel caricamento:', error);
            throw new Error(`Impossibile caricare ${key}: ${error.message}`);
        }
    }

    /**
     * Elimina dati dal localStorage
     * @param {string} key - Chiave di storage
     * @returns {Promise<void>}
     */
    async delete(key) {
        try {
            const fullKey = this.prefix + key;
            localStorage.removeItem(fullKey);
            this.removeFromIndex(key);
            
            this.emit('storage:delete', { key });
        } catch (error) {
            console.error('Errore nella cancellazione:', error);
            throw new Error(`Impossibile eliminare ${key}: ${error.message}`);
        }
    }

    /**
     * Query semplice sui dati
     * @param {object} filter - Filtro per la query
     * @returns {Promise<any[]>}
     */
    async query(filter) {
        try {
            const results = [];
            const keys = this.getAllKeys();

            for (const key of keys) {
                const data = await this.load(key);
                if (data && this.matchesFilter(data, filter)) {
                    results.push({ key, data });
                }
            }

            return results;
        } catch (error) {
            console.error('Errore nella query:', error);
            throw new Error(`Errore nella query: ${error.message}`);
        }
    }

    /**
     * Esegue una transazione (operazioni multiple atomiche)
     * @param {Function[]} operations - Array di operazioni da eseguire
     * @returns {Promise<void>}
     */
    async transaction(operations) {
        const backup = new Map();
        
        try {
            // Backup dei dati che verranno modificati
            for (const op of operations) {
                if (op.type === 'save' || op.type === 'delete') {
                    const existing = await this.load(op.key);
                    backup.set(op.key, existing);
                }
            }

            // Esegui operazioni
            for (const op of operations) {
                switch (op.type) {
                    case 'save':
                        await this.save(op.key, op.data);
                        break;
                    case 'delete':
                        await this.delete(op.key);
                        break;
                    default:
                        throw new Error(`Operazione non supportata: ${op.type}`);
                }
            }

            this.emit('storage:transaction:success', { operations });
        } catch (error) {
            // Rollback in caso di errore
            console.warn('Rollback transazione in corso...');
            for (const [key, data] of backup) {
                if (data !== null) {
                    await this.save(key, data);
                } else {
                    await this.delete(key);
                }
            }
            
            this.emit('storage:transaction:error', { operations, error });
            throw error;
        }
    }

    /**
     * Ottiene tutte le chiavi del nostro namespace
     * @returns {string[]}
     */
    getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }
        return keys;
    }

    /**
     * Verifica se i dati corrispondono al filtro
     * @param {any} data - Dati da verificare
     * @param {object} filter - Filtro da applicare
     * @returns {boolean}
     */
    matchesFilter(data, filter) {
        for (const [key, value] of Object.entries(filter)) {
            if (data[key] !== value) {
                return false;
            }
        }
        return true;
    }

    /**
     * Aggiorna l'indice per performance
     * @param {string} key - Chiave
     * @param {any} data - Dati
     */
    updateIndex(key, data) {
        if (data && typeof data === 'object') {
            // Indicizza per tipo se presente
            if (data.type) {
                if (!this.indexes.has(data.type)) {
                    this.indexes.set(data.type, new Set());
                }
                this.indexes.get(data.type).add(key);
            }
        }
    }

    /**
     * Rimuove dall'indice
     * @param {string} key - Chiave da rimuovere
     */
    removeFromIndex(key) {
        for (const [type, keys] of this.indexes) {
            keys.delete(key);
        }
    }

    /**
     * Carica gli indici esistenti
     */
    loadIndexes() {
        const keys = this.getAllKeys();
        for (const key of keys) {
            try {
                const data = JSON.parse(localStorage.getItem(this.prefix + key))?.data;
                if (data) {
                    this.updateIndex(key, data);
                }
            } catch (error) {
                console.warn(`Errore nel caricamento indice per ${key}:`, error);
            }
        }
    }

    /**
     * Ottiene statistiche di utilizzo storage
     * @returns {object}
     */
    getStats() {
        const keys = this.getAllKeys();
        let totalSize = 0;
        
        keys.forEach(key => {
            const item = localStorage.getItem(this.prefix + key);
            if (item) {
                totalSize += item.length;
            }
        });

        return {
            totalKeys: keys.length,
            totalSize: totalSize,
            sizeFormatted: this.formatBytes(totalSize),
            typeDistribution: Object.fromEntries(
                Array.from(this.indexes.entries()).map(([type, keys]) => [type, keys.size])
            )
        };
    }

    /**
     * Formatta i bytes in formato leggibile
     * @param {number} bytes - Numero di bytes
     * @returns {string}
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Sistema di eventi semplice per notifiche
     */
    emit(event, data) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent(event, { detail: data }));
        }
    }

    /**
     * Pulisce tutti i dati del namespace
     * @returns {Promise<void>}
     */
    async clear() {
        const keys = this.getAllKeys();
        for (const key of keys) {
            await this.delete(key);
        }
        this.indexes.clear();
    }

    /**
     * Esporta tutti i dati per backup/migrazione
     * @returns {Promise<object>}
     */
    async export() {
        const data = {};
        const keys = this.getAllKeys();
        
        for (const key of keys) {
            data[key] = await this.load(key);
        }

        return {
            version: 1,
            timestamp: Date.now(),
            data: data
        };
    }

    /**
     * Importa dati da backup
     * @param {object} exportData - Dati esportati
     * @returns {Promise<void>}
     */
    async import(exportData) {
        if (!exportData.data) {
            throw new Error('Formato dati non valido');
        }

        const operations = Object.entries(exportData.data).map(([key, data]) => ({
            type: 'save',
            key,
            data
        }));

        await this.transaction(operations);
    }
}

// Singleton instance
const storageManager = new StorageManager();

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
} 