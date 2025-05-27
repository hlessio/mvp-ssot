/**
 * ModuleLoader - Carica dinamicamente i moduli dai file .mod.json
 * Gestisce il discovery, caricamento e caching dei moduli disponibili
 */
class ModuleLoader {
    constructor(basePath = './modules/') {
        this.moduleCache = new Map();
        this.moduleRegistry = new Map();
        this.basePath = basePath;
        this.eventBus = window.eventBus || null;
        this.moduleCompiler = window.moduleCompiler || null;
        
        this.loadingPromises = new Map();
        this.discoveryComplete = false;
    }

    /**
     * Inizializza il loader e scopre tutti i moduli disponibili
     */
    async initialize() {
        console.log('[ModuleLoader] Inizializzazione...');
        
        try {
            await this.discoverModules();
            this.discoveryComplete = true;
            
            if (this.eventBus) {
                this.eventBus.emit('moduleLoader.initialized', {
                    modulesFound: this.moduleRegistry.size,
                    modules: Array.from(this.moduleRegistry.keys())
                });
            }
            
            console.log(`[ModuleLoader] Inizializzazione completata. ${this.moduleRegistry.size} moduli trovati.`);
            return true;
            
        } catch (error) {
            console.error('[ModuleLoader] Errore inizializzazione:', error);
            throw error;
        }
    }

    /**
     * Scopre tutti i moduli disponibili nella directory modules
     */
    async discoverModules() {
        console.log('[ModuleLoader] Discovery moduli...');
        
        // Lista dei moduli noti (in un'implementazione reale, questo potrebbe venire da un API)
        const knownModules = [
            'contact-card',
            'crew-list', 
            'entity-list',
            'weather-widget',
            'task-list'
        ];
        
        const discoveryPromises = knownModules.map(async (moduleId) => {
            try {
                const moduleInfo = await this.loadModuleInfo(moduleId);
                if (moduleInfo) {
                    this.moduleRegistry.set(moduleId, moduleInfo);
                    console.log(`[ModuleLoader] Modulo registrato: ${moduleId}`);
                }
            } catch (error) {
                console.warn(`[ModuleLoader] Impossibile caricare modulo ${moduleId}:`, error.message);
            }
        });
        
        await Promise.allSettled(discoveryPromises);
        console.log(`[ModuleLoader] Discovery completata. ${this.moduleRegistry.size} moduli disponibili.`);
    }

    /**
     * Carica le informazioni di un modulo dal file .mod.json
     * @param {string} moduleId - ID del modulo
     * @returns {object|null} - Informazioni del modulo
     */
    async loadModuleInfo(moduleId) {
        const moduleUrl = `${this.basePath}${moduleId}.mod.json`;
        
        try {
            console.log(`[ModuleLoader] Caricamento info modulo: ${moduleUrl}`);
            
            const response = await fetch(moduleUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const moduleData = await response.json();
            
            // Valida la struttura base
            if (!moduleData.module_id || !moduleData.version) {
                throw new Error('Struttura modulo non valida: mancano module_id o version');
            }
            
            return {
                id: moduleData.module_id,
                version: moduleData.version,
                name: moduleData.name || moduleData.module_id,
                description: moduleData.description || '',
                category: moduleData.metadata?.category || 'General',
                author: moduleData.author || 'Unknown',
                tags: moduleData.tags || [],
                url: moduleUrl,
                data: moduleData,
                loadedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`[ModuleLoader] Errore caricamento ${moduleUrl}:`, error);
            return null;
        }
    }

    /**
     * Carica e compila un modulo specifico
     * @param {string} moduleId - ID del modulo da caricare
     * @param {object} options - Opzioni di compilazione
     * @returns {CompiledModule} - Modulo compilato
     */
    async loadModule(moduleId, options = {}) {
        console.log(`[ModuleLoader] Caricamento modulo: ${moduleId}`);
        
        // Controlla se il modulo è già in cache
        if (this.moduleCache.has(moduleId) && !options.forceReload) {
            console.log(`[ModuleLoader] Modulo ${moduleId} trovato in cache`);
            return this.moduleCache.get(moduleId);
        }
        
        // Evita caricamenti multipli simultanei
        if (this.loadingPromises.has(moduleId)) {
            console.log(`[ModuleLoader] Attesa caricamento in corso per ${moduleId}`);
            return await this.loadingPromises.get(moduleId);
        }
        
        // Crea promise di caricamento
        const loadingPromise = this._loadModuleInternal(moduleId, options);
        this.loadingPromises.set(moduleId, loadingPromise);
        
        try {
            const compiledModule = await loadingPromise;
            this.loadingPromises.delete(moduleId);
            return compiledModule;
            
        } catch (error) {
            this.loadingPromises.delete(moduleId);
            throw error;
        }
    }

    /**
     * Implementazione interna del caricamento modulo
     * @param {string} moduleId 
     * @param {object} options 
     * @returns {CompiledModule}
     */
    async _loadModuleInternal(moduleId, options) {
        // Verifica che il modulo sia registrato
        if (!this.moduleRegistry.has(moduleId)) {
            throw new Error(`Modulo ${moduleId} non trovato nel registry`);
        }
        
        const moduleInfo = this.moduleRegistry.get(moduleId);
        
        try {
            // Crea ModuleDefinition
            const moduleDefinition = new ModuleDefinition(moduleInfo.data);
            
            // Valida la definizione
            const validation = moduleDefinition.validate();
            if (!validation.isValid) {
                throw new Error(`Validazione fallita: ${validation.errors.join(', ')}`);
            }
            
            // Compila il modulo
            if (!this.moduleCompiler) {
                throw new Error('ModuleCompiler non disponibile');
            }
            
            const compiledModule = await this.moduleCompiler.compile(moduleDefinition, options);
            
            // Aggiungi alla cache
            this.moduleCache.set(moduleId, compiledModule);
            
            // Emetti evento di caricamento
            if (this.eventBus) {
                this.eventBus.emit('module.loaded', {
                    moduleId,
                    version: moduleInfo.version,
                    compiledAt: compiledModule.compiledAt
                });
            }
            
            console.log(`[ModuleLoader] Modulo ${moduleId} caricato e compilato con successo`);
            return compiledModule;
            
        } catch (error) {
            console.error(`[ModuleLoader] Errore caricamento modulo ${moduleId}:`, error);
            
            // Emetti evento di errore
            if (this.eventBus) {
                this.eventBus.emit('module.loadError', {
                    moduleId,
                    error: error.message
                });
            }
            
            throw error;
        }
    }

    /**
     * Ottiene la lista di tutti i moduli disponibili
     * @returns {Array} - Array di informazioni moduli
     */
    getAvailableModules() {
        return Array.from(this.moduleRegistry.values());
    }

    /**
     * Ottiene informazioni su un modulo specifico
     * @param {string} moduleId 
     * @returns {object|null}
     */
    getModuleInfo(moduleId) {
        return this.moduleRegistry.get(moduleId) || null;
    }

    /**
     * Ottiene moduli per categoria
     * @param {string} category 
     * @returns {Array}
     */
    getModulesByCategory(category) {
        return this.getAvailableModules().filter(module => 
            module.category === category
        );
    }

    /**
     * Cerca moduli per tag
     * @param {string} tag 
     * @returns {Array}
     */
    getModulesByTag(tag) {
        return this.getAvailableModules().filter(module => 
            module.tags.includes(tag)
        );
    }

    /**
     * Cerca moduli per testo
     * @param {string} searchText 
     * @returns {Array}
     */
    searchModules(searchText) {
        const search = searchText.toLowerCase();
        return this.getAvailableModules().filter(module => 
            module.name.toLowerCase().includes(search) ||
            module.description.toLowerCase().includes(search) ||
            module.tags.some(tag => tag.toLowerCase().includes(search))
        );
    }

    /**
     * Ricarica un modulo specifico
     * @param {string} moduleId 
     * @returns {CompiledModule}
     */
    async reloadModule(moduleId) {
        console.log(`[ModuleLoader] Ricaricamento modulo: ${moduleId}`);
        
        // Rimuovi dalla cache
        this.moduleCache.delete(moduleId);
        
        // Ricarica le informazioni del modulo
        const moduleInfo = await this.loadModuleInfo(moduleId);
        if (moduleInfo) {
            this.moduleRegistry.set(moduleId, moduleInfo);
        }
        
        // Carica il modulo con forceReload
        return await this.loadModule(moduleId, { forceReload: true });
    }

    /**
     * Pulisce la cache dei moduli
     */
    clearCache() {
        console.log('[ModuleLoader] Pulizia cache moduli');
        this.moduleCache.clear();
        
        if (this.eventBus) {
            this.eventBus.emit('moduleLoader.cacheCleared');
        }
    }

    /**
     * Ottiene statistiche del loader
     * @returns {object}
     */
    getStats() {
        return {
            registeredModules: this.moduleRegistry.size,
            cachedModules: this.moduleCache.size,
            discoveryComplete: this.discoveryComplete,
            loadingInProgress: this.loadingPromises.size,
            categories: [...new Set(this.getAvailableModules().map(m => m.category))],
            tags: [...new Set(this.getAvailableModules().flatMap(m => m.tags))]
        };
    }

    /**
     * Verifica se un modulo è un modulo di sistema
     * @param {string} moduleId 
     * @returns {boolean}
     */
    isSystemModule(moduleId) {
        const moduleInfo = this.getModuleInfo(moduleId);
        return moduleInfo && moduleInfo.category === 'System';
    }

    /**
     * Ottiene il tipo di entità richiesto da un modulo
     * @param {string} moduleId 
     * @returns {string|null}
     */
    getRequiredEntityType(moduleId) {
        const moduleInfo = this.getModuleInfo(moduleId);
        if (!moduleInfo || this.isSystemModule(moduleId)) {
            return null;
        }
        
        // Analizza i path degli slot per determinare il tipo di entità
        const slots = moduleInfo.data.slots || {};
        for (const slot of Object.values(slots)) {
            if (slot.path && !slot.path.startsWith('System.')) {
                const [entityType] = slot.path.split('.');
                return entityType;
            }
        }
        
        return null;
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.ModuleLoader = ModuleLoader;
} 