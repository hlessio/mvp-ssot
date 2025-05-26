/**
 * GridStackAdapter - Integrazione con GridStack per layout drag & drop
 * Gestisce la griglia di moduli con posizionamento e ridimensionamento
 */
class GridStackAdapter {
    constructor(container, options = {}) {
        this.container = container;
        this.gridstack = null;
        this.moduleMap = new Map(); // Map<gridElement, ModuleInstance>
        this.options = {
            cellHeight: 80,
            verticalMargin: 10,
            horizontalMargin: 10,
            animate: true,
            float: false,
            acceptWidgets: true,
            removable: '.trash',
            removeTimeout: 2000,
            ...options
        };
        
        this.eventBus = window.eventBus;
        this.callbacks = {
            onLayoutChange: [],
            onModuleAdd: [],
            onModuleRemove: []
        };
        
        this.init();
    }

    /**
     * Inizializza GridStack
     */
    init() {
        try {
            // Verifica che GridStack sia disponibile
            if (typeof GridStack === 'undefined') {
                throw new Error('GridStack library not loaded');
            }

            // Inizializza GridStack
            this.gridstack = GridStack.init(this.options, this.container);
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('GridStackAdapter initialized successfully');
            this.eventBus?.emit('gridstack:initialized', { adapter: this });
            
        } catch (error) {
            console.error('Failed to initialize GridStack:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners per GridStack
     */
    setupEventListeners() {
        if (!this.gridstack) return;

        // Layout change events
        this.gridstack.on('change', (event, items) => {
            this.handleLayoutChange(items);
        });

        // Widget add events
        this.gridstack.on('added', (event, items) => {
            items.forEach(item => this.handleWidgetAdded(item));
        });

        // Widget remove events
        this.gridstack.on('removed', (event, items) => {
            items.forEach(item => this.handleWidgetRemoved(item));
        });

        // Drag events
        this.gridstack.on('dragstart', (event, element) => {
            this.handleDragStart(element);
        });

        this.gridstack.on('dragstop', (event, element) => {
            this.handleDragStop(element);
        });
    }

    /**
     * Aggiunge un modulo alla griglia
     */
    addModule(moduleInstance, gridOptions = {}) {
        if (!this.gridstack || !moduleInstance) {
            throw new Error('GridStack not initialized or invalid module instance');
        }

        try {
            // Opzioni default per il widget
            const defaultOptions = {
                width: 4,
                height: 3,
                autoPosition: true,
                id: moduleInstance.id || `module-${Date.now()}`
            };

            const options = { ...defaultOptions, ...gridOptions };

            // Crea il contenitore per il modulo
            const widgetElement = this.createWidgetElement(moduleInstance, options);
            
            // Aggiunge il widget a GridStack
            const addedElement = this.gridstack.addWidget(widgetElement, options);
            
            // Mappa il widget al modulo
            this.moduleMap.set(addedElement, moduleInstance);
            
            // Monta il modulo nel contenitore
            const contentContainer = addedElement.querySelector('.grid-stack-item-content');
            if (contentContainer && moduleInstance.mount) {
                moduleInstance.mount(contentContainer);
            }

            // Notifica l'aggiunta
            this.notifyModuleAdd(moduleInstance, addedElement);
            
            console.log(`Module ${moduleInstance.id} added to grid`);
            return addedElement;
            
        } catch (error) {
            console.error('Failed to add module to grid:', error);
            throw error;
        }
    }

    /**
     * Crea l'elemento widget per GridStack
     */
    createWidgetElement(moduleInstance, options) {
        const widget = document.createElement('div');
        widget.className = 'grid-stack-item';
        widget.setAttribute('gs-id', options.id);
        
        // Header del modulo con titolo e controlli
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerHTML = `
            <span class="module-title">${moduleInstance.title || moduleInstance.moduleId}</span>
            <div class="module-controls">
                <button class="module-settings" title="Impostazioni">⚙️</button>
                <button class="module-remove" title="Rimuovi">✕</button>
            </div>
        `;

        // Contenuto del modulo
        const content = document.createElement('div');
        content.className = 'grid-stack-item-content';
        
        widget.appendChild(header);
        widget.appendChild(content);

        // Event listeners per i controlli
        this.setupWidgetControls(widget, moduleInstance);

        return widget;
    }

    /**
     * Setup controlli del widget (settings, remove)
     */
    setupWidgetControls(widget, moduleInstance) {
        const settingsBtn = widget.querySelector('.module-settings');
        const removeBtn = widget.querySelector('.module-remove');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openModuleSettings(moduleInstance);
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeModule(moduleInstance);
            });
        }
    }

    /**
     * Rimuove un modulo dalla griglia
     */
    removeModule(moduleInstance) {
        if (!this.gridstack || !moduleInstance) return;

        try {
            // Trova l'elemento widget corrispondente
            let widgetElement = null;
            for (const [element, instance] of this.moduleMap.entries()) {
                if (instance === moduleInstance || instance.id === moduleInstance.id) {
                    widgetElement = element;
                    break;
                }
            }

            if (widgetElement) {
                // Smonta il modulo
                if (moduleInstance.unmount) {
                    moduleInstance.unmount();
                }

                // Rimuove dalla mappa
                this.moduleMap.delete(widgetElement);

                // Rimuove da GridStack
                this.gridstack.removeWidget(widgetElement);

                // Notifica la rimozione
                this.notifyModuleRemove(moduleInstance);
                
                console.log(`Module ${moduleInstance.id} removed from grid`);
            }
            
        } catch (error) {
            console.error('Failed to remove module from grid:', error);
        }
    }

    /**
     * Ottiene il layout corrente della griglia
     */
    getLayout() {
        if (!this.gridstack) return [];

        return this.gridstack.save().map(item => ({
            id: item.id,
            x: item.x,
            y: item.y,
            width: item.w,
            height: item.h,
            moduleId: this.getModuleIdFromElement(item.el)
        }));
    }

    /**
     * Carica un layout nella griglia
     */
    loadLayout(layout, modules = []) {
        if (!this.gridstack || !Array.isArray(layout)) return;

        try {
            // Pulisce la griglia corrente
            this.clear();

            // Carica ogni elemento del layout
            layout.forEach(item => {
                const moduleInstance = modules.find(m => m.id === item.moduleId);
                if (moduleInstance) {
                    this.addModule(moduleInstance, {
                        x: item.x,
                        y: item.y,
                        width: item.width,
                        height: item.height,
                        id: item.id,
                        autoPosition: false
                    });
                }
            });

            console.log('Layout loaded successfully');
            
        } catch (error) {
            console.error('Failed to load layout:', error);
        }
    }

    /**
     * Pulisce la griglia
     */
    clear() {
        if (!this.gridstack) return;

        try {
            // Smonta tutti i moduli
            for (const moduleInstance of this.moduleMap.values()) {
                if (moduleInstance.unmount) {
                    moduleInstance.unmount();
                }
            }

            // Pulisce la mappa
            this.moduleMap.clear();

            // Rimuove tutti i widget
            this.gridstack.removeAll();
            
            console.log('Grid cleared');
            
        } catch (error) {
            console.error('Failed to clear grid:', error);
        }
    }

    /**
     * Abilita/disabilita modalità modifica
     */
    setEditMode(enabled) {
        if (!this.gridstack) return;

        if (enabled) {
            this.gridstack.enable();
            this.container.classList.add('edit-mode');
        } else {
            this.gridstack.disable();
            this.container.classList.remove('edit-mode');
        }
    }

    /**
     * Gestisce i cambiamenti di layout
     */
    handleLayoutChange(items) {
        const layout = this.getLayout();
        this.callbacks.onLayoutChange.forEach(callback => {
            try {
                callback(layout, items);
            } catch (error) {
                console.error('Layout change callback error:', error);
            }
        });

        this.eventBus?.emit('gridstack:layout-changed', { layout, items });
    }

    /**
     * Gestisce l'aggiunta di widget
     */
    handleWidgetAdded(item) {
        console.log('Widget added:', item);
    }

    /**
     * Gestisce la rimozione di widget
     */
    handleWidgetRemoved(item) {
        console.log('Widget removed:', item);
    }

    /**
     * Gestisce l'inizio del drag
     */
    handleDragStart(element) {
        element.classList.add('dragging');
        this.eventBus?.emit('gridstack:drag-start', { element });
    }

    /**
     * Gestisce la fine del drag
     */
    handleDragStop(element) {
        element.classList.remove('dragging');
        this.eventBus?.emit('gridstack:drag-stop', { element });
    }

    /**
     * Apre le impostazioni del modulo
     */
    openModuleSettings(moduleInstance) {
        this.eventBus?.emit('module:settings-requested', { moduleInstance });
    }

    /**
     * Ottiene l'ID del modulo da un elemento
     */
    getModuleIdFromElement(element) {
        const moduleInstance = this.moduleMap.get(element);
        return moduleInstance ? moduleInstance.id : null;
    }

    /**
     * Notifica l'aggiunta di un modulo
     */
    notifyModuleAdd(moduleInstance, element) {
        this.callbacks.onModuleAdd.forEach(callback => {
            try {
                callback(moduleInstance, element);
            } catch (error) {
                console.error('Module add callback error:', error);
            }
        });

        this.eventBus?.emit('gridstack:module-added', { moduleInstance, element });
    }

    /**
     * Notifica la rimozione di un modulo
     */
    notifyModuleRemove(moduleInstance) {
        this.callbacks.onModuleRemove.forEach(callback => {
            try {
                callback(moduleInstance);
            } catch (error) {
                console.error('Module remove callback error:', error);
            }
        });

        this.eventBus?.emit('gridstack:module-removed', { moduleInstance });
    }

    /**
     * Registra callback per eventi
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    /**
     * Rimuove callback per eventi
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    /**
     * Distrugge l'adapter
     */
    destroy() {
        try {
            if (this.gridstack) {
                this.clear();
                this.gridstack.destroy();
                this.gridstack = null;
            }

            this.moduleMap.clear();
            this.callbacks = { onLayoutChange: [], onModuleAdd: [], onModuleRemove: [] };
            
            console.log('GridStackAdapter destroyed');
            
        } catch (error) {
            console.error('Failed to destroy GridStackAdapter:', error);
        }
    }
}

// Export per uso globale
window.GridStackAdapter = GridStackAdapter;