/**
 * ModuleCompiler - Compila definizioni modulo in HTML+CSS+JS funzionanti
 * Trasforma i file mod.json in moduli web dinamici e reattivi
 */
// ModuleDefinition, EventBus e AttributeSpace saranno disponibili globalmente

class ModuleCompiler {
    constructor() {
        this.compiledModules = new Map();
        this.templateCache = new Map();
        this.styleCache = new Map();
        this.eventBus = window.eventBus || null;
        this.attributeSpace = window.attributeSpace || null;
        
        this.compilerOptions = {
            minify: false,
            debug: true,
            autoRecompile: true,
            cacheTemplates: true
        };
    }

    /**
     * Compila una definizione modulo in un modulo funzionante
     * @param {ModuleDefinition} moduleDefinition - Definizione del modulo
     * @param {object} options - Opzioni di compilazione
     * @returns {CompiledModule}
     */
    async compile(moduleDefinition, options = {}) {
        const compileOptions = { ...this.compilerOptions, ...options };
        
        // Valida la definizione prima della compilazione
        const validation = moduleDefinition.validate();
        if (!validation.isValid) {
            throw new Error(`Errore validazione modulo: ${validation.errors.join(', ')}`);
        }

        const moduleId = moduleDefinition.moduleId;
        console.log(`[ModuleCompiler] Compilazione modulo: ${moduleId}`);

        try {
            // Estrai entità dalle opzioni se presente
            const entity = compileOptions.entity || null;
            
            // Genera HTML template
            const htmlTemplate = this.generateHTML(moduleDefinition, entity);
            
            // Genera CSS styles
            const cssStyles = this.generateCSS(moduleDefinition);
            
            // Genera JavaScript logic
            const jsLogic = this.generateJavaScript(moduleDefinition);
            
            // Crea il modulo compilato
            const compiledModule = new window.CompiledModule({
                moduleId,
                definition: moduleDefinition,
                html: htmlTemplate,
                css: cssStyles,
                js: jsLogic,
                compiledAt: new Date().toISOString(),
                options: compileOptions
            });

            // Cache del modulo compilato
            this.compiledModules.set(moduleId, compiledModule);

            // Setup auto-recompilazione se abilitata
            if (compileOptions.autoRecompile) {
                this.setupAutoRecompile(moduleDefinition, compileOptions);
            }

            console.log(`[ModuleCompiler] Modulo ${moduleId} compilato con successo`);
            return compiledModule;

        } catch (error) {
            console.error(`[ModuleCompiler] Errore compilazione ${moduleId}:`, error);
            throw new Error(`Compilazione fallita per ${moduleId}: ${error.message}`);
        }
    }

    /**
     * Genera il template HTML per il modulo
     * @param {ModuleDefinition} moduleDefinition
     * @param {Entity} entity - Entità opzionale per popolare i dati
     * @returns {string}
     */
    generateHTML(moduleDefinition, entity = null) {
        const { moduleId, layout, slots } = moduleDefinition;
        
        let html = `<div class="module-container" data-module-id="${moduleId}">`;
        
        // Genera header se presente
        if (layout.header) {
            html += this.generateLayoutSection('header', layout.header, slots, entity);
        }
        
        // Genera body principale
        if (layout.elements && layout.elements.length > 0) {
            html += '<div class="module-body">';
            for (const element of layout.elements) {
                html += this.generateLayoutElement(element, slots, entity);
            }
            html += '</div>';
        }
        
        // Genera footer se presente
        if (layout.footer) {
            html += this.generateLayoutSection('footer', layout.footer, slots, entity);
        }
        
        html += '</div>';
        
        return this.formatHTML(html);
    }

    /**
     * Genera una sezione del layout (header/footer)
     * @param {string} sectionType
     * @param {object} sectionConfig
     * @param {Map} slots
     * @param {Entity} entity - Entità opzionale per popolare i dati
     * @returns {string}
     */
    generateLayoutSection(sectionType, sectionConfig, slots, entity = null) {
        let html = `<div class="module-${sectionType}">`;
        
        if (sectionConfig.elements) {
            for (const element of sectionConfig.elements) {
                html += this.generateLayoutElement(element, slots, entity);
            }
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Genera un singolo elemento del layout
     * @param {object} element
     * @param {Map} slots
     * @param {Entity} entity - Entità opzionale per popolare i dati
     * @returns {string}
     */
    generateLayoutElement(element, slots, entity = null) {
        const { element: tagName, slot, attributes = {}, children = [] } = element;
        
        let html = `<${tagName}`;
        
        // Aggiungi attributi base
        for (const [attr, value] of Object.entries(attributes)) {
            html += ` ${attr}="${value}"`;
        }
        
        // Se l'elemento ha uno slot, aggiungi attributi per il binding
        if (slot && slots.has(slot)) {
            const slotDef = slots.get(slot);
            html += ` data-slot="${slot}"`;
            html += ` data-path="${slotDef.path}"`;
            html += ` data-type="${slotDef.type}"`;
            
            if (slotDef.editable) {
                html += ` data-editable="true"`;
            }
            
            if (slotDef.required) {
                html += ` data-required="true"`;
            }
        }
        
        html += '>';
        
        // Contenuto dell'elemento
        if (slot && slots.has(slot)) {
            const slotDef = slots.get(slot);
            html += this.generateSlotContent(slotDef, tagName, entity);
        }
        
        // Elementi figli
        for (const child of children) {
            html += this.generateLayoutElement(child, slots, entity);
        }
        
        // Chiudi tag se non è self-closing
        const selfClosingTags = ['input', 'img', 'br', 'hr', 'meta', 'link'];
        if (!selfClosingTags.includes(tagName)) {
            html += `</${tagName}>`;
        }
        
        return html;
    }

    /**
     * Genera il contenuto per uno slot
     * @param {SlotDefinition} slotDef
     * @param {string} tagName
     * @param {Entity} entity - Entità opzionale per popolare i dati
     * @returns {string}
     */
    generateSlotContent(slotDef, tagName, entity = null) {
        const { type, placeholder, defaultValue, options, path } = slotDef;
        
        // Per input elements, aggiungi attributi specifici
        if (tagName === 'input') {
            return ''; // Il contenuto è negli attributi
        }
        
        // Per select elements, genera options
        if (tagName === 'select' && options.length > 0) {
            let optionsHtml = '';
            for (const option of options) {
                const value = typeof option === 'object' ? option.value : option;
                const label = typeof option === 'object' ? option.label : option;
                optionsHtml += `<option value="${value}">${label}</option>`;
            }
            return optionsHtml;
        }
        
        // Estrai valore dall'entità se disponibile
        let content = '';
        if (entity && path) {
            const [entityType, attributeName] = path.split('.');
            if (entity.type === entityType && entity.hasAttribute(attributeName)) {
                const value = entity.getAttributeValue(attributeName);
                content = value !== null ? String(value) : '';
            }
        }
        
        // Fallback a placeholder o valore default
        if (!content) {
            content = placeholder || defaultValue || `{{${path || 'slot'}}}`;
        }
        
        return content;
    }

    /**
     * Genera gli stili CSS per il modulo
     * @param {ModuleDefinition} moduleDefinition
     * @returns {string}
     */
    generateCSS(moduleDefinition) {
        const { moduleId, styling, layout } = moduleDefinition;
        
        let css = `/* Stili per modulo ${moduleId} */\n`;
        css += `[data-module-id="${moduleId}"], .${moduleId} {\n`;
        
        // Stili base del container
        css += '  position: relative;\n';
        css += '  box-sizing: border-box;\n';
        
        // Applica tema se specificato
        if (styling.theme) {
            css += this.generateThemeStyles(styling.theme);
        }
        
        // Applica spacing se specificato
        if (styling.spacing) {
            css += this.generateSpacingStyles(styling.spacing);
        }
        
        // Stili per layout type
        if (layout.type) {
            css += this.generateLayoutStyles(layout.type);
        }
        
        css += '}\n\n';
        
        // Stili per elementi specifici
        css += this.generateElementStyles(moduleId, moduleDefinition.slots);
        
        // Stili custom se presenti
        if (styling.custom) {
            css += `/* Stili custom */\n${styling.custom}\n`;
        }
        
        return css;
    }

    /**
     * Genera stili per il tema
     * @param {string} theme
     * @returns {string}
     */
    generateThemeStyles(theme) {
        const themes = {
            minimal: `
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #333333;`,
            modern: `
  background: #ffffff;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  color: #2c3e50;`,
            classic: `
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 0;
  color: #495057;`,
            dark: `
  background: #2c3e50;
  border: 1px solid #34495e;
  border-radius: 6px;
  color: #ecf0f1;`,
            light: `
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  color: #333333;`
        };
        
        return themes[theme] || themes.minimal;
    }

    /**
     * Genera stili per spacing
     * @param {string} spacing
     * @returns {string}
     */
    generateSpacingStyles(spacing) {
        const spacings = {
            compact: '\n  padding: 8px;\n  gap: 4px;',
            normal: '\n  padding: 16px;\n  gap: 8px;',
            relaxed: '\n  padding: 24px;\n  gap: 16px;'
        };
        
        return spacings[spacing] || spacings.normal;
    }

    /**
     * Genera stili per layout type
     * @param {string} layoutType
     * @returns {string}
     */
    generateLayoutStyles(layoutType) {
        const layouts = {
            card: '\n  display: block;',
            list: '\n  display: flex;\n  flex-direction: column;',
            table: '\n  display: table;\n  width: 100%;',
            form: '\n  display: flex;\n  flex-direction: column;\n  gap: 12px;',
            grid: '\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 16px;',
            custom: '\n  display: block;'
        };
        
        return layouts[layoutType] || layouts.card;
    }

    /**
     * Genera stili per elementi e slot
     * @param {string} moduleId
     * @param {Map} slots
     * @returns {string}
     */
    generateElementStyles(moduleId, slots) {
        let css = '';
        
        // Stili per slot editabili
        css += `[data-module-id="${moduleId}"] [data-editable="true"], .${moduleId} [data-editable="true"] {\n`;
        css += '  cursor: pointer;\n';
        css += '  transition: background-color 0.2s;\n';
        css += '}\n\n';
        
        css += `[data-module-id="${moduleId}"] [data-editable="true"]:hover, .${moduleId} [data-editable="true"]:hover {\n`;
        css += '  background-color: rgba(0, 123, 255, 0.1);\n';
        css += '}\n\n';
        
        // Stili per slot required
        css += `[data-module-id="${moduleId}"] [data-required="true"]:empty::after, .${moduleId} [data-required="true"]:empty::after {\n`;
        css += '  content: "*";\n';
        css += '  color: #dc3545;\n';
        css += '  margin-left: 4px;\n';
        css += '}\n\n';
        
        return css;
    }

    /**
     * Genera la logica JavaScript per il modulo
     * @param {ModuleDefinition} moduleDefinition
     * @returns {string}
     */
    generateJavaScript(moduleDefinition) {
        const { moduleId, slots, behavior } = moduleDefinition;
        
        let js = `// JavaScript per modulo ${moduleId}\n`;
        js += `(function() {\n`;
        js += `  'use strict';\n\n`;
        
        // Classe del modulo
        js += `  class Module_${moduleId.replace(/[^a-zA-Z0-9]/g, '_')} {\n`;
        js += `    constructor(container, entity = null) {\n`;
        js += `      this.container = container;\n`;
        js += `      this.moduleId = '${moduleId}';\n`;
        js += `      this.entity = entity;\n`;
        js += `      this.slots = new Map();\n`;
        js += `      this.eventBus = window.eventBus;\n`;
        js += `      this.attributeSpace = window.attributeSpace;\n\n`;
        js += `      this.init();\n`;
        js += `    }\n\n`;
        
        // Metodo init
        js += `    init() {\n`;
        js += `      this.setupSlots();\n`;
        js += `      this.bindEvents();\n`;
        js += `      this.loadData();\n`;
        js += `    }\n\n`;
        
        // Setup slots
        js += `    setupSlots() {\n`;
        for (const [slotName, slotDef] of slots) {
            js += `      this.slots.set('${slotName}', {\n`;
            js += `        name: '${slotName}',\n`;
            js += `        path: '${slotDef.path}',\n`;
            js += `        type: '${slotDef.type}',\n`;
            js += `        editable: ${slotDef.editable},\n`;
            js += `        required: ${slotDef.required}\n`;
            js += `      });\n`;
        }
        js += `    }\n\n`;
        
        // Bind events
        js += `    bindEvents() {\n`;
        js += `      // Bind slot events\n`;
        js += `      const slotElements = this.container.querySelectorAll('[data-slot]');\n`;
        js += `      slotElements.forEach(element => {\n`;
        js += `        const slotName = element.dataset.slot;\n`;
        js += `        const slotConfig = this.slots.get(slotName);\n`;
        js += `        if (slotConfig && slotConfig.editable) {\n`;
        js += `          this.bindSlotEvents(element, slotConfig);\n`;
        js += `        }\n`;
        js += `      });\n\n`;
        
        js += `      // Bind reactive updates\n`;
        js += `      if (this.attributeSpace) {\n`;
        js += `        console.log('[Module] Sottoscrizione agli eventi globali per modulo:', this.moduleId);\n`;
        js += `        this.attributeSpace.subscribeGlobal((event) => {\n`;
        js += `          console.log('[Module] Ricevuto evento globale:', event);\n`;
        js += `          this.handleAttributeChange(event);\n`;
        js += `        });\n`;
        js += `      }\n`;
        js += `    }\n\n`;
        
        // Bind slot events
        js += `    bindSlotEvents(element, slotConfig) {\n`;
        js += `      if (slotConfig.type === 'text' || slotConfig.type === 'textarea') {\n`;
        js += `        element.addEventListener('blur', (e) => {\n`;
        js += `          this.updateSlotValue(slotConfig, e.target.textContent || e.target.value);\n`;
        js += `        });\n`;
        js += `      } else if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {\n`;
        js += `        element.addEventListener('change', (e) => {\n`;
        js += `          this.updateSlotValue(slotConfig, e.target.value);\n`;
        js += `        });\n`;
        js += `      }\n`;
        js += `    }\n\n`;
        
        // Update slot value
        js += `    updateSlotValue(slotConfig, value) {\n`;
        js += `      if (!slotConfig.path || !this.entity) return;\n\n`;
        js += `      const [entityType, attributeName] = slotConfig.path.split('.');\n`;
        js += `      \n`;
        js += `      // Verifica che l'entità corrisponda al tipo richiesto\n`;
        js += `      if (this.entity.type === entityType) {\n`;
        js += `        console.log('[Module] Aggiornamento attributo:', attributeName, '=', value);\n`;
        js += `        this.entity.setAttributeValue(attributeName, value);\n`;
        js += `      }\n`;
        js += `    }\n\n`;
        
        // Handle attribute changes
        js += `    handleAttributeChange(event) {\n`;
        js += `      console.log('[Module] handleAttributeChange chiamato con:', event);\n`;
        js += `      if (!this.entity) {\n`;
        js += `        console.log('[Module] Nessuna entità collegata');\n`;
        js += `        return;\n`;
        js += `      }\n`;
        js += `      if (!event) {\n`;
        js += `        console.log('[Module] Evento non valido');\n`;
        js += `        return;\n`;
        js += `      }\n\n`;
        js += `      const { entityId, entityType, attributeName, newValue } = event;\n`;
        js += `      console.log('[Module] Dati evento - entityId:', entityId, 'this.entity.id:', this.entity.id);\n`;
        js += `      \n`;
        js += `      // Verifica che l'evento riguardi la nostra entità\n`;
        js += `      if (entityId !== this.entity.id) {\n`;
        js += `        console.log('[Module] Evento non per questa entità, ignorato');\n`;
        js += `        return;\n`;
        js += `      }\n\n`;
        js += `      const path = entityType + '.' + attributeName;\n`;
        js += `      console.log('[Module] Ricevuto cambiamento per la nostra entità:', path, '=', newValue);\n\n`;
        js += `      // Trova slot che corrispondono a questo path\n`;
        js += `      for (const [slotName, slotConfig] of this.slots) {\n`;
        js += `        console.log('[Module] Controllo slot:', slotName, 'path:', slotConfig.path, 'vs', path);\n`;
        js += `        if (slotConfig.path === path) {\n`;
        js += `          console.log('[Module] Slot corrispondente trovato:', slotName);\n`;
        js += `          this.updateSlotDisplay(slotName, newValue);\n`;
        js += `        }\n`;
        js += `      }\n`;
        js += `    }\n\n`;
        
        // Update slot display
        js += `    updateSlotDisplay(slotName, value) {\n`;
        js += `      console.log('[Module] Aggiornamento display slot:', slotName, '=', value);\n`;
        js += `      const element = this.container.querySelector('[data-slot="' + slotName + '"]');\n`;
        js += `      if (!element) {\n`;
        js += `        console.warn('[Module] Elemento non trovato per slot:', slotName);\n`;
        js += `        return;\n`;
        js += `      }\n\n`;
        js += `      console.log('[Module] Elemento trovato:', element.tagName, element);\n`;
        js += `      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {\n`;
        js += `        element.value = value || '';\n`;
        js += `        console.log('[Module] Aggiornato input value:', element.value);\n`;
        js += `      } else if (element.tagName === 'SELECT') {\n`;
        js += `        element.value = value || '';\n`;
        js += `        console.log('[Module] Aggiornato select value:', element.value);\n`;
        js += `      } else {\n`;
        js += `        element.textContent = value || '';\n`;
        js += `        console.log('[Module] Aggiornato textContent:', element.textContent);\n`;
        js += `      }\n`;
        js += `    }\n\n`;
        
        // Load data
        js += `    loadData() {\n`;
        js += `      // Carica dati iniziali per tutti gli slot dall'entità\n`;
        js += `      if (!this.entity) return;\n\n`;
        js += `      for (const [slotName, slotConfig] of this.slots) {\n`;
        js += `        if (slotConfig.path) {\n`;
        js += `          const [entityType, attributeName] = slotConfig.path.split('.');\n`;
        js += `          if (this.entity.type === entityType) {\n`;
        js += `            const value = this.entity.getAttributeValue(attributeName);\n`;
        js += `            if (value !== null && value !== undefined) {\n`;
        js += `              console.log('[Module] Caricamento dato:', slotName, '=', value);\n`;
        js += `              this.updateSlotDisplay(slotName, value);\n`;
        js += `            }\n`;
        js += `          }\n`;
        js += `        }\n`;
        js += `      }\n`;
        js += `    }\n`;
        
        js += `  }\n\n`;
        
        // Auto-inizializzazione
        js += `  // Auto-inizializzazione quando il DOM è pronto\n`;
        js += `  function initModule(entity = null) {\n`;
        js += `    const containers = document.querySelectorAll('[data-module-id="${moduleId}"]');\n`;
        js += `    containers.forEach(container => {\n`;
        js += `      if (!container._moduleInstance) {\n`;
        js += `        container._moduleInstance = new Module_${moduleId.replace(/[^a-zA-Z0-9]/g, '_')}(container, entity);\n`;
        js += `      }\n`;
        js += `    });\n`;
        js += `  }\n\n`;
        
        js += `  // Esponi la funzione di inizializzazione globalmente\n`;
        js += `  window.initModule_${moduleId.replace(/[^a-zA-Z0-9]/g, '_')} = initModule;\n\n`;
        
        js += `  if (document.readyState === 'loading') {\n`;
        js += `    document.addEventListener('DOMContentLoaded', initModule);\n`;
        js += `  } else {\n`;
        js += `    initModule();\n`;
        js += `  }\n\n`;
        
        js += `})();\n`;
        
        return js;
    }

    /**
     * Formatta l'HTML per leggibilità
     * @param {string} html
     * @returns {string}
     */
    formatHTML(html) {
        // Semplice formattazione per leggibilità
        return html
            .replace(/></g, '>\n<')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index, array) => {
                const depth = this.getHTMLDepth(line, array.slice(0, index));
                return '  '.repeat(depth) + line;
            })
            .join('\n');
    }

    /**
     * Calcola la profondità di indentazione per HTML
     * @param {string} line
     * @param {string[]} previousLines
     * @returns {number}
     */
    getHTMLDepth(line, previousLines) {
        let depth = 0;
        let openTags = [];
        
        for (const prevLine of previousLines) {
            const openMatch = prevLine.match(/<(\w+)[^>]*>/g);
            const closeMatch = prevLine.match(/<\/(\w+)>/g);
            
            if (openMatch) {
                for (const tag of openMatch) {
                    const tagName = tag.match(/<(\w+)/)[1];
                    if (!tag.includes('/>')) {
                        openTags.push(tagName);
                    }
                }
            }
            
            if (closeMatch) {
                for (const tag of closeMatch) {
                    const tagName = tag.match(/<\/(\w+)>/)[1];
                    const lastIndex = openTags.lastIndexOf(tagName);
                    if (lastIndex !== -1) {
                        openTags.splice(lastIndex, 1);
                    }
                }
            }
        }
        
        return openTags.length;
    }

    /**
     * Setup auto-ricompilazione quando cambiano le definizioni
     * @param {ModuleDefinition} moduleDefinition
     * @param {object} options
     */
    setupAutoRecompile(moduleDefinition, options) {
        const moduleId = moduleDefinition.moduleId;
        
        // Ascolta cambiamenti nella definizione del modulo
        this.eventBus.on(`module.${moduleId}.updated`, async (event) => {
            console.log(`[ModuleCompiler] Auto-ricompilazione ${moduleId}`);
            try {
                const updatedDefinition = event.data.definition;
                await this.compile(updatedDefinition, options);
                
                // Notifica ricompilazione completata
                this.eventBus.emit(`module.${moduleId}.recompiled`, {
                    moduleId,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error(`[ModuleCompiler] Errore auto-ricompilazione ${moduleId}:`, error);
            }
        });
    }

    /**
     * Ottiene un modulo compilato dalla cache
     * @param {string} moduleId
     * @returns {CompiledModule|null}
     */
    getCompiledModule(moduleId) {
        return this.compiledModules.get(moduleId) || null;
    }

    /**
     * Rimuove un modulo dalla cache
     * @param {string} moduleId
     */
    removeCompiledModule(moduleId) {
        this.compiledModules.delete(moduleId);
        this.templateCache.delete(moduleId);
        this.styleCache.delete(moduleId);
    }

    /**
     * Pulisce tutte le cache
     */
    clearCache() {
        this.compiledModules.clear();
        this.templateCache.clear();
        this.styleCache.clear();
    }

    /**
     * Ottiene statistiche del compiler
     * @returns {object}
     */
    getStats() {
        return {
            compiledModules: this.compiledModules.size,
            templateCacheSize: this.templateCache.size,
            styleCacheSize: this.styleCache.size,
            modules: Array.from(this.compiledModules.keys())
        };
    }
}

/**
 * CompiledModule - Rappresenta un modulo compilato
 */
class CompiledModule {
    constructor(config) {
        this.moduleId = config.moduleId;
        this.definition = config.definition;
        this.html = config.html;
        this.css = config.css;
        this.js = config.js;
        this.compiledAt = config.compiledAt;
        this.options = config.options;
    }

    /**
     * Renderizza il modulo in un container DOM
     * @param {HTMLElement} container
     * @param {Entity} entity - Entità da collegare al modulo
     */
    render(container, entity = null) {
        // Inserisci HTML
        container.innerHTML = this.html;
        
        // Inserisci CSS se non già presente
        if (!document.querySelector(`style[data-module="${this.moduleId}"]`)) {
            const styleElement = document.createElement('style');
            styleElement.setAttribute('data-module', this.moduleId);
            styleElement.textContent = this.css;
            document.head.appendChild(styleElement);
        }
        
        // Esegui JavaScript
        if (!window[`Module_${this.moduleId}_loaded`]) {
            const scriptElement = document.createElement('script');
            scriptElement.textContent = this.js;
            document.head.appendChild(scriptElement);
            window[`Module_${this.moduleId}_loaded`] = true;
        }
        
        // Inizializza il modulo con l'entità
        const initFunctionName = `initModule_${this.moduleId.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (window[initFunctionName]) {
            // Usa l'entità dalle opzioni di compilazione se non fornita
            const targetEntity = entity || this.options?.entity;
            window[initFunctionName](targetEntity);
        }
    }

    /**
     * Ottiene il bundle completo come stringa
     * @returns {string}
     */
    getBundle() {
        return `
<!-- Modulo ${this.moduleId} - Compilato il ${this.compiledAt} -->
<style data-module="${this.moduleId}">
${this.css}
</style>

${this.html}

<script>
${this.js}
</script>
        `.trim();
    }

    /**
     * Serializza il modulo compilato
     * @returns {object}
     */
    serialize() {
        return {
            moduleId: this.moduleId,
            definition: this.definition.serialize(),
            html: this.html,
            css: this.css,
            js: this.js,
            compiledAt: this.compiledAt,
            options: this.options
        };
    }
}

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.ModuleCompiler = ModuleCompiler;
    window.CompiledModule = CompiledModule;
} 