/**
 * ModuleInstance - Rappresenta un'istanza persistente di un modulo
 * Ogni istanza ha un ID univoco e mantiene il suo stato
 */
class ModuleInstance {
    constructor(moduleId, instanceId = null, config = {}) {
        this.moduleId = moduleId;
        this.instanceId = instanceId || this.generateInstanceId();
        this.config = config;
        this.state = {};
        this.entityIds = new Set(); // Entità collegate a questa istanza
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        
        // Riferimenti ai servizi globali
        this.storageManager = window.storageManager;
        this.entityManager = window.entityManager;
        this.eventBus = window.eventBus;
        
        // Auto-save state changes
        this.setupAutoSave();
    }
    
    /**
     * Genera un ID univoco per l'istanza
     */
    generateInstanceId() {
        return `${this.moduleId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Salva l'istanza del modulo
     */
    async save() {
        try {
            const instanceData = {
                moduleId: this.moduleId,
                instanceId: this.instanceId,
                config: this.config,
                state: this.state,
                entityIds: Array.from(this.entityIds),
                createdAt: this.createdAt,
                updatedAt: new Date().toISOString()
            };
            
            await this.storageManager.save(`module_instance_${this.instanceId}`, instanceData);
            console.log(`[ModuleInstance] Salvata istanza: ${this.instanceId}`);
            
            // Notifica salvataggio
            if (this.eventBus) {
                this.eventBus.emit('moduleInstance.saved', {
                    instanceId: this.instanceId,
                    moduleId: this.moduleId
                });
            }
            
        } catch (error) {
            console.error(`[ModuleInstance] Errore salvataggio ${this.instanceId}:`, error);
            throw error;
        }
    }
    
    /**
     * Carica un'istanza dal storage
     */
    static async load(instanceId) {
        try {
            const storageManager = window.storageManager;
            const instanceData = await storageManager.load(`module_instance_${instanceId}`);
            
            if (!instanceData) {
                throw new Error(`Istanza ${instanceId} non trovata`);
            }
            
            const instance = new ModuleInstance(
                instanceData.moduleId,
                instanceData.instanceId,
                instanceData.config
            );
            
            instance.state = instanceData.state || {};
            instance.entityIds = new Set(instanceData.entityIds || []);
            instance.createdAt = instanceData.createdAt;
            instance.updatedAt = instanceData.updatedAt;
            
            console.log(`[ModuleInstance] Caricata istanza: ${instanceId}`);
            return instance;
            
        } catch (error) {
            console.error(`[ModuleInstance] Errore caricamento ${instanceId}:`, error);
            throw error;
        }
    }
    
    /**
     * Collega un'entità a questa istanza
     */
    async addEntity(entityId) {
        this.entityIds.add(entityId);
        this.state.lastEntityAdded = entityId;
        this.updatedAt = new Date().toISOString();
        
        await this.save();
        
        console.log(`[ModuleInstance] Entità ${entityId} collegata a istanza ${this.instanceId}`);
    }
    
    /**
     * Scollega un'entità da questa istanza
     */
    async removeEntity(entityId) {
        this.entityIds.delete(entityId);
        this.updatedAt = new Date().toISOString();
        
        await this.save();
        
        console.log(`[ModuleInstance] Entità ${entityId} scollegata da istanza ${this.instanceId}`);
    }
    
    /**
     * Ottiene tutte le entità collegate a questa istanza
     */
    getLinkedEntities() {
        if (!this.entityManager) return [];
        
        const entities = [];
        for (const entityId of this.entityIds) {
            const entity = this.entityManager.getEntity(entityId);
            if (entity) {
                entities.push(entity);
            }
        }
        
        return entities;
    }
    
    /**
     * Crea una nuova entità collegata a questa istanza
     */
    async createLinkedEntity(entityType, initialData = {}) {
        if (!this.entityManager) {
            throw new Error('EntityManager non disponibile');
        }
        
        const entity = await this.entityManager.createEntity(entityType, null, initialData);
        await this.addEntity(entity.id);
        
        return entity;
    }
    
    /**
     * Aggiorna lo stato dell'istanza
     */
    async updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.updatedAt = new Date().toISOString();
        
        await this.save();
    }
    
    /**
     * Setup auto-save per cambiamenti di stato
     */
    setupAutoSave() {
        // Debounce auto-save
        this.saveTimeout = null;
        this.debouncedSave = () => {
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            this.saveTimeout = setTimeout(() => {
                this.save().catch(error => {
                    console.error('[ModuleInstance] Auto-save fallito:', error);
                });
            }, 1000);
        };
    }
    
    /**
     * Genera URL univoco per questa istanza
     */
    getUrl() {
        return `/modulo/${this.instanceId}`;
    }
    
    /**
     * Ottiene metadati dell'istanza
     */
    getMetadata() {
        return {
            instanceId: this.instanceId,
            moduleId: this.moduleId,
            entityCount: this.entityIds.size,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            url: this.getUrl()
        };
    }
    
    /**
     * Elimina l'istanza e i suoi dati
     */
    async delete() {
        try {
            // Rimuovi dal storage
            await this.storageManager.delete(`module_instance_${this.instanceId}`);
            
            // Notifica eliminazione
            if (this.eventBus) {
                this.eventBus.emit('moduleInstance.deleted', {
                    instanceId: this.instanceId,
                    moduleId: this.moduleId
                });
            }
            
            console.log(`[ModuleInstance] Istanza eliminata: ${this.instanceId}`);
            
        } catch (error) {
            console.error(`[ModuleInstance] Errore eliminazione ${this.instanceId}:`, error);
            throw error;
        }
    }
    
    /**
     * Lista tutte le istanze salvate
     */
    static async listAll() {
        try {
            const storageManager = window.storageManager;
            const allKeys = await storageManager.getAllKeys();
            const instanceKeys = allKeys.filter(key => key.startsWith('module_instance_'));
            
            const instances = [];
            for (const key of instanceKeys) {
                try {
                    const instanceData = await storageManager.load(key);
                    if (instanceData) {
                        instances.push({
                            instanceId: instanceData.instanceId,
                            moduleId: instanceData.moduleId,
                            entityCount: (instanceData.entityIds || []).length,
                            createdAt: instanceData.createdAt,
                            updatedAt: instanceData.updatedAt
                        });
                    }
                } catch (error) {
                    console.warn(`[ModuleInstance] Errore caricamento ${key}:`, error);
                }
            }
            
            return instances;
            
        } catch (error) {
            console.error('[ModuleInstance] Errore lista istanze:', error);
            return [];
        }
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.ModuleInstance = ModuleInstance;
} 