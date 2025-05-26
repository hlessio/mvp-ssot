/**
 * EventBus - Sistema di eventi globale per la comunicazione tra componenti
 * Implementa il pattern Observer per la propagazione di eventi
 */
class EventBus {
    constructor() {
        this.listeners = new Map(); // event -> Set<callback>
        this.onceListeners = new Map(); // event -> Set<callback>
        this.wildcardListeners = new Set(); // callback per tutti gli eventi
        this.eventHistory = [];
        this.maxHistorySize = 500;
        this.debugMode = false;
        
        // Namespace per eventi
        this.namespaces = new Map(); // namespace -> EventBus
        
        this.setupErrorHandling();
    }

    /**
     * Sottoscrive a un evento
     * @param {string} event - Nome dell'evento
     * @param {Function} callback - Funzione da chiamare
     * @param {object} options - Opzioni per la sottoscrizione
     * @returns {Function} - Funzione per annullare la sottoscrizione
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Il callback deve essere una funzione');
        }

        const { 
            once = false, 
            priority = 0, 
            namespace = null,
            condition = null 
        } = options;

        // Gestione namespace
        if (namespace) {
            return this.getNamespace(namespace).on(event, callback, { ...options, namespace: null });
        }

        // Wrapper per callback con metadati
        const wrappedCallback = {
            original: callback,
            priority: priority,
            condition: condition,
            id: this.generateCallbackId(),
            createdAt: new Date().toISOString()
        };

        if (once) {
            if (!this.onceListeners.has(event)) {
                this.onceListeners.set(event, new Set());
            }
            this.onceListeners.get(event).add(wrappedCallback);
        } else {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, new Set());
            }
            this.listeners.get(event).add(wrappedCallback);
        }

        this.debugLog(`Sottoscrizione aggiunta per evento '${event}'`, { 
            callbackId: wrappedCallback.id, 
            once, 
            priority 
        });

        // Ritorna funzione per unsubscribe
        return () => this.off(event, callback);
    }

    /**
     * Sottoscrive a un evento per una sola volta
     * @param {string} event - Nome dell'evento
     * @param {Function} callback - Funzione da chiamare
     * @param {object} options - Opzioni per la sottoscrizione
     * @returns {Function} - Funzione per annullare la sottoscrizione
     */
    once(event, callback, options = {}) {
        return this.on(event, callback, { ...options, once: true });
    }

    /**
     * Rimuove una sottoscrizione
     * @param {string} event - Nome dell'evento
     * @param {Function} callback - Funzione da rimuovere
     * @param {object} options - Opzioni per la rimozione
     */
    off(event, callback, options = {}) {
        const { namespace = null } = options;

        // Gestione namespace
        if (namespace) {
            return this.getNamespace(namespace).off(event, callback);
        }

        // Rimuovi da listeners normali
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            for (const wrappedCallback of listeners) {
                if (wrappedCallback.original === callback) {
                    listeners.delete(wrappedCallback);
                    this.debugLog(`Sottoscrizione rimossa per evento '${event}'`, { 
                        callbackId: wrappedCallback.id 
                    });
                    break;
                }
            }
            if (listeners.size === 0) {
                this.listeners.delete(event);
            }
        }

        // Rimuovi da listeners once
        if (this.onceListeners.has(event)) {
            const onceListeners = this.onceListeners.get(event);
            for (const wrappedCallback of onceListeners) {
                if (wrappedCallback.original === callback) {
                    onceListeners.delete(wrappedCallback);
                    break;
                }
            }
            if (onceListeners.size === 0) {
                this.onceListeners.delete(event);
            }
        }
    }

    /**
     * Emette un evento
     * @param {string} event - Nome dell'evento
     * @param {any} data - Dati da passare ai listener
     * @param {object} options - Opzioni per l'emissione
     * @returns {Promise<any[]>} - Array dei risultati dei callback
     */
    async emit(event, data = null, options = {}) {
        const { 
            async = false, 
            namespace = null,
            stopOnError = false,
            timeout = null 
        } = options;

        // Gestione namespace
        if (namespace) {
            return this.getNamespace(namespace).emit(event, data, { ...options, namespace: null });
        }

        const eventData = {
            event: event,
            data: data,
            timestamp: new Date().toISOString(),
            source: options.source || 'unknown'
        };

        // Aggiungi alla cronologia
        this.addToHistory(eventData);

        this.debugLog(`Emissione evento '${event}'`, eventData);

        const results = [];
        const allCallbacks = [];

        // Raccogli tutti i callback
        if (this.listeners.has(event)) {
            allCallbacks.push(...Array.from(this.listeners.get(event)));
        }

        if (this.onceListeners.has(event)) {
            const onceCallbacks = Array.from(this.onceListeners.get(event));
            allCallbacks.push(...onceCallbacks);
            // Rimuovi i callback once dopo averli raccolti
            this.onceListeners.delete(event);
        }

        // Aggiungi wildcard listeners
        allCallbacks.push(...Array.from(this.wildcardListeners).map(cb => ({
            original: cb,
            priority: 0,
            condition: null,
            id: 'wildcard'
        })));

        // Ordina per priorità (priorità più alta prima)
        allCallbacks.sort((a, b) => b.priority - a.priority);

        // Esegui i callback
        for (const wrappedCallback of allCallbacks) {
            try {
                // Verifica condizione se presente
                if (wrappedCallback.condition && !wrappedCallback.condition(eventData)) {
                    continue;
                }

                let result;
                if (async) {
                    if (timeout) {
                        result = await this.executeWithTimeout(
                            wrappedCallback.original, 
                            eventData, 
                            timeout
                        );
                    } else {
                        result = await wrappedCallback.original(eventData);
                    }
                } else {
                    result = wrappedCallback.original(eventData);
                }

                results.push(result);

                // Se il callback ritorna false, ferma la propagazione
                if (result === false) {
                    this.debugLog(`Propagazione fermata da callback per evento '${event}'`);
                    break;
                }

            } catch (error) {
                this.handleCallbackError(error, event, wrappedCallback);
                
                if (stopOnError) {
                    throw error;
                }
            }
        }

        return results;
    }

    /**
     * Sottoscrive a tutti gli eventi (wildcard)
     * @param {Function} callback - Funzione da chiamare per tutti gli eventi
     * @returns {Function} - Funzione per annullare la sottoscrizione
     */
    onAny(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Il callback deve essere una funzione');
        }

        this.wildcardListeners.add(callback);

        return () => {
            this.wildcardListeners.delete(callback);
        };
    }

    /**
     * Rimuove tutti i listener per un evento
     * @param {string} event - Nome dell'evento
     */
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
            this.debugLog(`Tutti i listener rimossi per evento '${event}'`);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
            this.wildcardListeners.clear();
            this.debugLog('Tutti i listener rimossi');
        }
    }

    /**
     * Ottiene il numero di listener per un evento
     * @param {string} event - Nome dell'evento
     * @returns {number}
     */
    listenerCount(event) {
        let count = 0;
        if (this.listeners.has(event)) {
            count += this.listeners.get(event).size;
        }
        if (this.onceListeners.has(event)) {
            count += this.onceListeners.get(event).size;
        }
        return count;
    }

    /**
     * Ottiene tutti gli eventi con listener attivi
     * @returns {string[]}
     */
    eventNames() {
        const events = new Set();
        for (const event of this.listeners.keys()) {
            events.add(event);
        }
        for (const event of this.onceListeners.keys()) {
            events.add(event);
        }
        return Array.from(events);
    }

    /**
     * Crea o ottiene un namespace
     * @param {string} name - Nome del namespace
     * @returns {EventBus}
     */
    getNamespace(name) {
        if (!this.namespaces.has(name)) {
            const namespaceBus = new EventBus();
            namespaceBus.debugMode = this.debugMode;
            this.namespaces.set(name, namespaceBus);
        }
        return this.namespaces.get(name);
    }

    /**
     * Rimuove un namespace
     * @param {string} name - Nome del namespace
     */
    removeNamespace(name) {
        if (this.namespaces.has(name)) {
            this.namespaces.get(name).removeAllListeners();
            this.namespaces.delete(name);
        }
    }

    /**
     * Esegue un callback con timeout
     * @param {Function} callback - Callback da eseguire
     * @param {object} data - Dati da passare
     * @param {number} timeout - Timeout in millisecondi
     * @returns {Promise<any>}
     */
    async executeWithTimeout(callback, data, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Callback timeout dopo ${timeout}ms`));
            }, timeout);

            Promise.resolve(callback(data))
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    /**
     * Gestisce errori nei callback
     * @param {Error} error - Errore verificatosi
     * @param {string} event - Nome dell'evento
     * @param {object} callback - Callback che ha generato l'errore
     */
    handleCallbackError(error, event, callback) {
        const errorData = {
            error: error,
            event: event,
            callbackId: callback.id,
            timestamp: new Date().toISOString()
        };

        console.error(`Errore nel callback per evento '${event}':`, error);
        
        // Emetti evento di errore (senza propagare ulteriori errori)
        try {
            this.emit('eventbus:error', errorData, { stopOnError: false });
        } catch (e) {
            console.error('Errore nell\'emissione dell\'evento di errore:', e);
        }
    }

    /**
     * Genera un ID univoco per i callback
     * @returns {string}
     */
    generateCallbackId() {
        return `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Aggiunge un evento alla cronologia
     * @param {object} eventData - Dati dell'evento
     */
    addToHistory(eventData) {
        this.eventHistory.push(eventData);
        
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Ottiene la cronologia degli eventi
     * @param {object} options - Opzioni di filtro
     * @returns {Array}
     */
    getHistory(options = {}) {
        let history = [...this.eventHistory];
        
        if (options.event) {
            history = history.filter(entry => entry.event === options.event);
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
            this.eventHistory = this.eventHistory.filter(
                entry => new Date(entry.timestamp) >= beforeDate
            );
        } else {
            this.eventHistory = [];
        }
    }

    /**
     * Setup gestione errori globale
     */
    setupErrorHandling() {
        // Gestisci errori non catturati
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.emit('eventbus:global-error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.emit('eventbus:unhandled-rejection', {
                    reason: event.reason,
                    promise: event.promise
                });
            });
        }
    }

    /**
     * Abilita/disabilita modalità debug
     * @param {boolean} enabled - Se abilitare il debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        // Applica a tutti i namespace
        for (const namespaceBus of this.namespaces.values()) {
            namespaceBus.setDebugMode(enabled);
        }
    }

    /**
     * Log di debug
     * @param {string} message - Messaggio
     * @param {object} data - Dati aggiuntivi
     */
    debugLog(message, data = {}) {
        if (this.debugMode) {
            console.log(`[EventBus] ${message}`, data);
        }
    }

    /**
     * Ottiene statistiche dell'EventBus
     * @returns {object}
     */
    getStats() {
        const stats = {
            totalEvents: this.eventNames().length,
            totalListeners: 0,
            totalOnceListeners: 0,
            wildcardListeners: this.wildcardListeners.size,
            namespaces: this.namespaces.size,
            historySize: this.eventHistory.length,
            eventDistribution: {}
        };

        // Conta listener per evento
        for (const [event, listeners] of this.listeners) {
            stats.totalListeners += listeners.size;
            stats.eventDistribution[event] = {
                listeners: listeners.size,
                onceListeners: 0
            };
        }

        for (const [event, listeners] of this.onceListeners) {
            stats.totalOnceListeners += listeners.size;
            if (!stats.eventDistribution[event]) {
                stats.eventDistribution[event] = { listeners: 0, onceListeners: 0 };
            }
            stats.eventDistribution[event].onceListeners = listeners.size;
        }

        return stats;
    }

    /**
     * Crea un proxy per eventi con prefisso
     * @param {string} prefix - Prefisso per gli eventi
     * @returns {object}
     */
    createProxy(prefix) {
        return {
            on: (event, callback, options) => this.on(`${prefix}:${event}`, callback, options),
            once: (event, callback, options) => this.once(`${prefix}:${event}`, callback, options),
            off: (event, callback) => this.off(`${prefix}:${event}`, callback),
            emit: (event, data, options) => this.emit(`${prefix}:${event}`, data, options)
        };
    }

    /**
     * Pulisce tutte le risorse
     */
    destroy() {
        this.removeAllListeners();
        this.clearHistory();
        
        for (const namespaceBus of this.namespaces.values()) {
            namespaceBus.destroy();
        }
        this.namespaces.clear();
    }
}

// Singleton instance globale
const eventBus = new EventBus();

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
}
// EventBus è già disponibile globalmente 