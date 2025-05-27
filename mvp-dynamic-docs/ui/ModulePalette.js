/**
 * ModulePalette - Palette dei moduli disponibili per drag & drop
 * Gestisce la visualizzazione e il trascinamento dei moduli verso la griglia
 */
class ModulePalette {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            collapsible: true,
            searchable: true,
            categories: true,
            ...options
        };
        
        this.modules = new Map(); // Map<moduleId, ModuleDefinition>
        this.categories = new Map(); // Map<category, modules[]>
        this.filteredModules = new Map();
        this.searchTerm = '';
        this.selectedCategory = 'all';
        
        this.eventBus = window.eventBus;
        this.moduleRegistry = window.ModuleRegistry;
        
        this.init();
    }

    /**
     * Inizializza la palette
     */
    init() {
        this.setupContainer();
        this.loadModules();
        this.setupEventListeners();
        this.render();
        
        console.log('ModulePalette initialized');
    }

    /**
     * Setup del container della palette
     */
    setupContainer() {
        if (!this.container) return;

        this.container.className = 'module-palette';
        this.container.innerHTML = `
            <div class="palette-header">
                <h3>Moduli Disponibili</h3>
                <button class="palette-toggle" title="Comprimi/Espandi">−</button>
            </div>
            <div class="palette-content">
                ${this.options.searchable ? `
                    <div class="palette-search">
                        <input type="text" placeholder="Cerca moduli..." class="search-input">
                        <button class="search-clear" title="Pulisci">✕</button>
                    </div>
                ` : ''}
                ${this.options.categories ? `
                    <div class="palette-categories">
                        <select class="category-select">
                            <option value="all">Tutte le categorie</option>
                        </select>
                    </div>
                ` : ''}
                <div class="palette-modules"></div>
            </div>
        `;

        this.setupContainerEvents();
    }

    /**
     * Setup eventi del container
     */
    setupContainerEvents() {
        if (!this.container) return;

        // Toggle collapse
        const toggleBtn = this.container.querySelector('.palette-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleCollapse();
            });
        }

        // Search
        const searchInput = this.container.querySelector('.search-input');
        const searchClear = this.container.querySelector('.search-clear');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setSearchTerm(e.target.value);
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.setSearchTerm('');
                }
            });
        }

        // Category filter
        const categorySelect = this.container.querySelector('.category-select');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.setCategory(e.target.value);
            });
        }
    }

    /**
     * Setup event listeners globali
     */
    setupEventListeners() {
        if (!this.eventBus) return;

        // Registrazione nuovi moduli
        this.eventBus.on('module:registered', (data) => {
            if (data.moduleDefinition) {
                this.addModule(data.moduleDefinition);
            }
        });

        // Rimozione moduli
        this.eventBus.on('module:unregistered', (data) => {
            if (data.moduleId) {
                this.removeModule(data.moduleId);
            }
        });
    }

    /**
     * Carica i moduli dal registry
     */
    async loadModules() {
        try {
            if (this.moduleRegistry) {
                const modules = await this.moduleRegistry.getAllModules();
                modules.forEach(module => this.addModule(module));
            } else {
                // Carica moduli di esempio se il registry non è disponibile
                await this.loadExampleModules();
            }
            
            this.updateCategories();
            this.applyFilters();
            
        } catch (error) {
            console.error('Failed to load modules:', error);
        }
    }

    /**
     * Carica moduli di esempio
     */
    async loadExampleModules() {
        const exampleModules = [
            {
                moduleId: 'contact-card',
                title: 'Contact Card',
                description: 'Visualizza informazioni di contatto di una persona',
                category: 'contact',
                icon: '👤',
                version: '1.0.0',
                slots: {
                    nome: { path: 'Cliente.nome', type: 'text', editable: true },
                    email: { path: 'Cliente.email', type: 'email', editable: true },
                    telefono: { path: 'Cliente.telefono', type: 'tel', editable: true }
                }
            },
            {
                moduleId: 'crew-list',
                title: 'Crew List',
                description: 'Lista del crew per un shooting day',
                category: 'production',
                icon: '👥',
                version: '1.0.0',
                slots: {
                    membri: { path: 'ShootingDay.crew', type: 'array', editable: true }
                }
            },
            {
                moduleId: 'weather-widget',
                title: 'Weather Widget',
                description: 'Informazioni meteo per location',
                category: 'production',
                icon: '🌤️',
                version: '1.0.0',
                slots: {
                    location: { path: 'Location.nome', type: 'text', editable: false },
                    weather: { path: 'Location.meteo', type: 'object', editable: true }
                }
            },
            {
                moduleId: 'task-list',
                title: 'Task List',
                description: 'Lista di task e todo',
                category: 'productivity',
                icon: '✅',
                version: '1.0.0',
                slots: {
                    tasks: { path: 'Progetto.tasks', type: 'array', editable: true }
                }
            },
            {
                moduleId: 'entity-list',
                title: 'Elenco Entità',
                description: 'Tabella semplice con tutte le entità del sistema',
                category: 'system',
                icon: '🏢',
                version: '1.0.0',
                slots: {
                    entities: { path: 'System.allEntities', type: 'array', editable: true }
                }
            }
        ];

        exampleModules.forEach(module => this.addModule(module));
    }

    /**
     * Aggiunge un modulo alla palette
     */
    addModule(moduleDefinition) {
        if (!moduleDefinition || !moduleDefinition.moduleId) return;

        this.modules.set(moduleDefinition.moduleId, moduleDefinition);
        
        // Aggiunge alla categoria
        const category = moduleDefinition.category || 'general';
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(moduleDefinition.moduleId);
        
        this.updateCategories();
        this.applyFilters();
        this.render();
    }

    /**
     * Rimuove un modulo dalla palette
     */
    removeModule(moduleId) {
        const module = this.modules.get(moduleId);
        if (!module) return;

        this.modules.delete(moduleId);
        
        // Rimuove dalla categoria
        const category = module.category || 'general';
        if (this.categories.has(category)) {
            const categoryModules = this.categories.get(category);
            const index = categoryModules.indexOf(moduleId);
            if (index > -1) {
                categoryModules.splice(index, 1);
            }
            
            // Rimuove la categoria se vuota
            if (categoryModules.length === 0) {
                this.categories.delete(category);
            }
        }
        
        this.updateCategories();
        this.applyFilters();
        this.render();
    }

    /**
     * Aggiorna le categorie nel select
     */
    updateCategories() {
        const categorySelect = this.container?.querySelector('.category-select');
        if (!categorySelect) return;

        // Mantiene la selezione corrente
        const currentValue = categorySelect.value;
        
        // Pulisce le opzioni
        categorySelect.innerHTML = '<option value="all">Tutte le categorie</option>';
        
        // Aggiunge le categorie
        const sortedCategories = Array.from(this.categories.keys()).sort();
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.formatCategoryName(category);
            categorySelect.appendChild(option);
        });
        
        // Ripristina la selezione se ancora valida
        if (Array.from(categorySelect.options).some(opt => opt.value === currentValue)) {
            categorySelect.value = currentValue;
        }
    }

    /**
     * Formatta il nome della categoria
     */
    formatCategoryName(category) {
        const names = {
            contact: 'Contatti',
            production: 'Produzione',
            productivity: 'Produttività',
            system: 'Sistema',
            general: 'Generale'
        };
        
        return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    /**
     * Imposta il termine di ricerca
     */
    setSearchTerm(term) {
        this.searchTerm = term.toLowerCase().trim();
        this.applyFilters();
        this.render();
    }

    /**
     * Imposta la categoria selezionata
     */
    setCategory(category) {
        this.selectedCategory = category;
        this.applyFilters();
        this.render();
    }

    /**
     * Applica i filtri ai moduli
     */
    applyFilters() {
        this.filteredModules.clear();
        
        for (const [moduleId, module] of this.modules.entries()) {
            let include = true;
            
            // Filtro categoria
            if (this.selectedCategory !== 'all') {
                const moduleCategory = module.category || 'general';
                if (moduleCategory !== this.selectedCategory) {
                    include = false;
                }
            }
            
            // Filtro ricerca
            if (include && this.searchTerm) {
                const searchableText = [
                    module.title || '',
                    module.description || '',
                    module.moduleId || ''
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(this.searchTerm)) {
                    include = false;
                }
            }
            
            if (include) {
                this.filteredModules.set(moduleId, module);
            }
        }
    }

    /**
     * Renderizza la palette
     */
    render() {
        const modulesContainer = this.container?.querySelector('.palette-modules');
        if (!modulesContainer) return;

        modulesContainer.innerHTML = '';
        
        if (this.filteredModules.size === 0) {
            modulesContainer.innerHTML = `
                <div class="no-modules">
                    <p>Nessun modulo trovato</p>
                </div>
            `;
            return;
        }

        // Raggruppa per categoria se abilitato
        if (this.options.categories && this.selectedCategory === 'all') {
            this.renderByCategories(modulesContainer);
        } else {
            this.renderModuleList(modulesContainer, this.filteredModules);
        }
    }

    /**
     * Renderizza i moduli raggruppati per categoria
     */
    renderByCategories(container) {
        const modulesByCategory = new Map();
        
        // Raggruppa i moduli filtrati per categoria
        for (const [moduleId, module] of this.filteredModules.entries()) {
            const category = module.category || 'general';
            if (!modulesByCategory.has(category)) {
                modulesByCategory.set(category, new Map());
            }
            modulesByCategory.get(category).set(moduleId, module);
        }
        
        // Renderizza ogni categoria
        const sortedCategories = Array.from(modulesByCategory.keys()).sort();
        sortedCategories.forEach(category => {
            const categoryModules = modulesByCategory.get(category);
            
            const categorySection = document.createElement('div');
            categorySection.className = 'module-category';
            categorySection.innerHTML = `
                <h4 class="category-title">${this.formatCategoryName(category)}</h4>
                <div class="category-modules"></div>
            `;
            
            const categoryContainer = categorySection.querySelector('.category-modules');
            this.renderModuleList(categoryContainer, categoryModules);
            
            container.appendChild(categorySection);
        });
    }

    /**
     * Renderizza una lista di moduli
     */
    renderModuleList(container, modules) {
        for (const [moduleId, module] of modules.entries()) {
            const moduleElement = this.createModuleElement(module);
            container.appendChild(moduleElement);
        }
    }

    /**
     * Crea l'elemento per un modulo
     */
    createModuleElement(module) {
        const element = document.createElement('div');
        element.className = 'palette-module';
        element.draggable = true;
        element.dataset.moduleId = module.moduleId;
        
        element.innerHTML = `
            <div class="module-icon">${module.icon || '📦'}</div>
            <div class="module-info">
                <div class="module-title">${module.title || module.moduleId}</div>
                <div class="module-description">${module.description || ''}</div>
                <div class="module-version">v${module.version || '1.0.0'}</div>
            </div>
        `;

        this.setupModuleDragEvents(element, module);
        
        return element;
    }

    /**
     * Setup eventi di drag per un modulo
     */
    setupModuleDragEvents(element, module) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'module',
                moduleId: module.moduleId,
                module: module
            }));
            
            e.dataTransfer.effectAllowed = 'copy';
            element.classList.add('dragging');
            
            this.eventBus?.emit('module:drag-start', { module, element });
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            this.eventBus?.emit('module:drag-end', { module, element });
        });

        // Click per info/preview
        element.addEventListener('click', (e) => {
            if (!element.classList.contains('dragging')) {
                this.showModuleInfo(module);
            }
        });
    }

    /**
     * Mostra informazioni dettagliate del modulo
     */
    showModuleInfo(module) {
        this.eventBus?.emit('module:info-requested', { module });
        
        // Implementazione semplice con alert per ora
        const info = [
            `Modulo: ${module.title || module.moduleId}`,
            `Versione: ${module.version || '1.0.0'}`,
            `Categoria: ${this.formatCategoryName(module.category || 'general')}`,
            `Descrizione: ${module.description || 'Nessuna descrizione'}`,
            '',
            'Attributi richiesti:',
            ...Object.entries(module.slots || {}).map(([name, slot]) => 
                `• ${name}: ${slot.path} (${slot.type})`
            )
        ].join('\n');
        
        alert(info);
    }

    /**
     * Toggle collapse della palette
     */
    toggleCollapse() {
        const content = this.container?.querySelector('.palette-content');
        const toggle = this.container?.querySelector('.palette-toggle');
        
        if (content && toggle) {
            const isCollapsed = content.style.display === 'none';
            
            if (isCollapsed) {
                content.style.display = '';
                toggle.textContent = '−';
                this.container.classList.remove('collapsed');
            } else {
                content.style.display = 'none';
                toggle.textContent = '+';
                this.container.classList.add('collapsed');
            }
        }
    }

    /**
     * Aggiorna la palette
     */
    refresh() {
        this.loadModules();
    }

    /**
     * Distrugge la palette
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.modules.clear();
        this.categories.clear();
        this.filteredModules.clear();
        
        console.log('ModulePalette destroyed');
    }
}

// Export per uso globale
window.ModulePalette = ModulePalette; 