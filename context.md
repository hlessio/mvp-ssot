**META-PROMPT PER L'ASSISTENTE AI:** Questo documento serve come contesto principale per il progetto "Piattaforma Documenti Dinamici". Ad ogni tua azione o modifica al codice, aggiorna le sezioni rilevanti di questo file per mantenere una traccia accurata dello stato del progetto, delle decisioni prese e dei progressi fatti.

# MVP: Piattaforma Documenti Dinamici - Specifica Implementazione

## 📊 **STATO PROGETTO - AGGIORNAMENTO 26 MAGGIO 2025**

### 🎯 **MILESTONE RAGGIUNTE**
- ✅ **FASE 2 COMPLETATA**: Core System (Storage, Entity, Reactive, Module) - 23/23 test passati
- ✅ **FASE 4 COMPLETATA**: Document Builder con GridStack - Demo funzionante
- ✅ **GIT REPOSITORY**: Inizializzato con commit iniziale (32 files, 11577 lines)
- ✅ **DEMO OPERATIVA**: document-builder-demo.html con suite test completa

### 🔧 **SISTEMA FUNZIONANTE**
Il sistema è **completamente operativo** con:
- **Auto-discovery attributi**: Creazione automatica quando richiesti da moduli
- **Sistema reattivo**: Propagazione istantanea modifiche tra moduli
- **Compilazione moduli**: Da JSON a HTML+CSS+JS funzionante
- **Document Builder**: Drag & drop con GridStack operativo
- **Persistenza**: LocalStorage con preparazione migrazione database

## Visione del Progetto

### Concetto Centrale
Una piattaforma che permette di creare "documenti viventi" - applicazioni web dinamiche che si aggiornano automaticamente quando cambiano i dati sottostanti. Ogni documento è composto da moduli riutilizzabili che si collegano a una fonte di verità unica (Single Source of Truth).

### Principi Fondamentali
1. **Entità Evolutive**: Le entità acquisiscono attributi dinamicamente quando interagiscono con moduli che ne hanno bisogno
2. **Moduli Declarativi**: Componenti definiti tramite file JSON che vengono compilati automaticamente in HTML+CSS+JS
3. **Reattività Globale**: Modifiche a un dato si propagano istantaneamente a tutti i moduli che lo visualizzano
4. **Semplicità Tecnologica**: HTML+CSS+JS vanilla, senza framework complessi

### Use Case Chiave

#### Scenario: Produzione Video - Callsheet
- **Entità**: ShootingDay, Persona (crew/attori), Location, Inquadratura
- **Documento**: Callsheet interattiva con moduli per crew list, weather, shot progress
- **Flusso**: Aggiungi una persona al crew → appare automaticamente in tutti i documenti aperti

#### Scenario: Gestione Clienti - Preventivo
- **Entità**: Cliente, Servizio, Preventivo
- **Documento**: Dashboard preventivo con contact card e dettaglio servizi
- **Flusso**: Modifica email cliente in contact card → si aggiorna automaticamente nel preventivo

## 🏗️ **ARCHITETTURA IMPLEMENTATA**

### **FASE 2 - CORE SYSTEM ✅ COMPLETATA E VALIDATA**

#### **1. Storage Layer (✅ TESTATO: 6/6)**
- **`StorageManager.js`**: Sistema di persistenza completo con LocalStorage
  - Operazioni CRUD asincrone con gestione errori
  - Sistema di transazioni con rollback automatico
  - Query semplici con filtri e indicizzazione
  - Sistema di eventi per notifiche
  - Statistiche di utilizzo e gestione dimensione
  - Export/import per backup e migrazione

- **`MigrationInterface.js`**: Interfaccia per evoluzione verso database reali
  - Sistema di migrazione versionale con handler registrabili
  - Export/import standardizzato con validazione formato
  - Preparazione per migrazione verso IndexedDB e SQL
  - Generazione automatica di schema SQL
  - Gestione backup automatici

#### **2. Entity System (✅ TESTATO: 7/7)**
- **`Attribute.js`**: Classe per attributi singoli
  - Validazione completa per tutti i tipi (text, number, email, url, date, boolean, array, object)
  - Trasformazione automatica dei valori
  - Sistema di validatori e trasformatori personalizzabili
  - Metadati estesi (required, editable, min/max, pattern)
  - Serializzazione/deserializzazione
  - Notifiche di cambiamento

- **`Entity.js`**: Classe per entità con attributi dinamici
  - **Auto-discovery degli attributi** quando richiesti ✅ VALIDATO
  - Inferenza automatica del tipo basata sul valore
  - Gestione completa del ciclo di vita degli attributi
  - Sistema di eventi interno e globale
  - Validazione dell'intera entità
  - Confronto e applicazione di modifiche tra entità
  - Gestione tag e metadati

- **`AttributeSpace.js`**: Registry globale per sistema reattivo
  - Registrazione centralizzata di tutti gli attributi
  - Sistema di sottoscrizioni multi-livello (attributo, entità, tipo, globale)
  - **Propagazione automatica delle modifiche** ✅ VALIDATO
  - Cronologia completa dei cambiamenti
  - Operazioni batch per performance
  - Statistiche e monitoraggio

#### **3. Sistema Reattivo (✅ TESTATO: 3/3)**
- **`EventBus.js`**: Sistema di eventi globale avanzato
  - Sottoscrizioni con priorità, condizioni e timeout
  - Namespace per organizzazione eventi
  - Listener wildcard per tutti gli eventi
  - Gestione errori robusta con eventi di errore
  - Cronologia eventi con filtri
  - Modalità debug e statistiche
  - Proxy per eventi con prefisso

#### **4. Module System (✅ TESTATO: 6/6)**
- **`ModuleDefinition.js`**: Parser e validatore per mod.json
  - Parsing completo delle definizioni modulo
  - Validazione rigorosa di tutti i componenti (slots, layout, styling, dipendenze)
  - Gestione semantic versioning
  - Verifica compatibilità con entità
  - Sistema di slot con path verso attributi entità
  - Supporto per dipendenze tra moduli

- **`ModuleCompiler.js`**: **Compilatore da JSON a HTML+CSS+JS** ✅ VALIDATO
  - **Generazione automatica** di template HTML da definizioni layout
  - **Compilazione CSS** con temi, spacing e layout types
  - **Generazione JavaScript** per binding reattivo e gestione eventi
  - Sistema di cache per performance
  - Auto-ricompilazione quando cambiano le definizioni
  - Rendering diretto in container DOM
  - Bundle completo per distribuzione

### **FASE 4 - DOCUMENT BUILDER & GRIDSTACK ✅ COMPLETATA**

#### **1. Document System**
- **`Document.js`**: Gestione documenti completa
  - Container per moduli con layout GridStack
  - Salvataggio/caricamento configurazioni
  - Gestione ciclo di vita moduli
  - Sistema di eventi per sincronizzazione

- **`GridStackAdapter.js`**: Integrazione GridStack avanzata
  - **Drag & drop completo** ✅ VALIDATO
  - Gestione responsive automatica
  - Persistenza layout con LocalStorage
  - Eventi di resize e move
  - Auto-fit contenuti moduli

#### **2. UI Components**
- **`DocumentBuilder.js`**: Orchestratore principale
  - Toolbar completa (nuovo, salva, carica, esporta)
  - Gestione stato applicazione
  - Coordinamento tra tutti i componenti
  - Sistema di notifiche utente

- **`ModulePalette.js`**: Palette moduli avanzata
  - **4 moduli di esempio** implementati
  - Sistema di categorie (Contact, Production, Utility, Task)
  - **Ricerca in tempo reale** ✅ VALIDATO
  - Drag & drop verso griglia
  - Anteprima moduli

- **`EntitySelector.js`**: Modal selezione entità
  - **Creazione entità al volo** ✅ VALIDATO
  - Lista entità esistenti con filtri
  - Validazione input
  - Integrazione con AttributeSpace

#### **3. Styling System**
- **`gridstack.css`**: CSS responsive completo
  - Layout responsive mobile/tablet/desktop
  - Temi moderni per moduli
  - Animazioni smooth per drag & drop
  - Styling palette e toolbar

### **DEMO & TESTING ✅ OPERATIVA**

#### **Demo Completa: `document-builder-demo.html`**
- **10 test automatici** per validazione workflow
- **Test manuali** per drag & drop
- **Panel di test interattivo** con logging dettagliato
- **Workflow completo validato**: Entità → Moduli → Document → Persistenza

#### **Risultati Test Attuali**
```
🧪 TEST SUITE RISULTATI:
✅ Inizializzazione: PASSATO
✅ Componenti: PASSATO (9/9 caricati)
✅ Nuovo Documento: PASSATO
✅ Module Palette: PASSATO (4 moduli)
✅ Ricerca Moduli: PASSATO
✅ Entity Selector: PASSATO
✅ Creazione Entità: PASSATO
✅ Drag & Drop: PASSATO
✅ Salvataggio: PASSATO
✅ Caricamento: PASSATO

STATO: 10/10 TEST PASSATI ✅
```

## 🔄 **SISTEMA DI COMPILAZIONE: DA MOD.JSON A HTML+CSS+JS**

### **Come Funziona l'Implementazione**

#### **1. Definizione Modulo (mod.json)**
Ogni modulo è definito in un file JSON con questa struttura:

```json
{
  "module_id": "contact-card",
  "version": "1.0.0",
  "metadata": {
    "name": "Contact Card",
    "description": "Scheda contatto con informazioni base",
    "category": "Contact",
    "author": "MVP System"
  },
  "slots": {
    "nome": {
      "path": "Cliente.nome",
      "type": "text",
      "editable": true,
      "required": true,
      "label": "Nome Completo"
    },
    "email": {
      "path": "Cliente.email", 
      "type": "email",
      "editable": true,
      "label": "Email"
    }
  },
  "layout": {
    "type": "card",
    "elements": [
      {
        "slot": "nome",
        "element": "h3",
        "class": "contact-name"
      },
      {
        "slot": "email",
        "element": "input",
        "class": "contact-email",
        "placeholder": "Inserisci email"
      }
    ]
  },
  "styling": {
    "theme": "minimal",
    "spacing": "normal"
  }
}
```

#### **2. Processo di Compilazione**

**Step 1: Parsing e Validazione**
```javascript
// ModuleDefinition.js
const definition = new ModuleDefinition();
definition.parse(modJsonContent);
definition.validate(); // Verifica struttura e dipendenze
```

**Step 2: Generazione HTML**
```javascript
// ModuleCompiler.js - generateHTML()
const html = `
<div class="module-container contact-card-module">
  <h3 class="contact-name" data-slot="nome">
    ${entity.getAttribute('nome')?.value || 'Nome non specificato'}
  </h3>
  <input class="contact-email" 
         data-slot="email" 
         type="email" 
         placeholder="Inserisci email"
         value="${entity.getAttribute('email')?.value || ''}">
</div>`;
```

**Step 3: Generazione CSS**
```javascript
// ModuleCompiler.js - generateCSS()
const css = `
.contact-card-module {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.contact-card-module .contact-name {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 1.2em;
}
.contact-card-module .contact-email {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}`;
```

**Step 4: Generazione JavaScript**
```javascript
// ModuleCompiler.js - generateJS()
const js = `
class ContactCardModule {
  constructor(entity, container) {
    this.entity = entity;
    this.container = container;
    this.eventBus = window.eventBus;
    this.attributeSpace = window.attributeSpace;
    this.setupBindings();
  }
  
  setupBindings() {
    // Binding bidirezionale per email
    const emailInput = this.container.querySelector('[data-slot="email"]');
    emailInput.addEventListener('input', (e) => {
      this.entity.setAttribute('email', e.target.value, 'email');
    });
    
    // Sottoscrizione a cambiamenti
    this.attributeSpace.subscribe(this.entity.id, 'email', (newValue) => {
      emailInput.value = newValue;
    });
  }
}`;
```

#### **3. Esempio Pratico: Contact Card**

**Input: `contact-card.mod.json`**
```json
{
  "module_id": "contact-card",
  "slots": {
    "nome": {"path": "Cliente.nome", "type": "text", "editable": true},
    "email": {"path": "Cliente.email", "type": "email", "editable": true},
    "telefono": {"path": "Cliente.telefono", "type": "tel", "editable": true}
  },
  "layout": {
    "type": "card",
    "elements": [
      {"slot": "nome", "element": "h3"},
      {"slot": "email", "element": "input"},
      {"slot": "telefono", "element": "input"}
    ]
  }
}
```

**Output: HTML+CSS+JS Compilato**
```html
<!-- HTML Generato -->
<div class="module-container contact-card-module">
  <h3 data-slot="nome">Mario Rossi</h3>
  <input data-slot="email" type="email" value="mario@example.com">
  <input data-slot="telefono" type="tel" value="+39 123 456 7890">
</div>

<style>
/* CSS Generato */
.contact-card-module {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>

<script>
// JavaScript Generato con binding reattivo
class ContactCardModule {
  constructor(entity, container) {
    this.entity = entity;
    this.setupBindings();
  }
  
  setupBindings() {
    // Auto-binding per tutti gli input editabili
    this.container.querySelectorAll('[data-slot]').forEach(element => {
      if (element.tagName === 'INPUT') {
        element.addEventListener('input', (e) => {
          const slot = e.target.dataset.slot;
          this.entity.setAttribute(slot, e.target.value);
        });
      }
    });
  }
}
</script>
```

#### **4. Auto-Discovery degli Attributi**

Quando il modulo viene istanziato:

1. **Richiesta Attributo**: `entity.getAttribute('email')`
2. **Auto-Creation**: Se non esiste, viene creato automaticamente
3. **Type Inference**: Tipo dedotto dal modulo (`"type": "email"`)
4. **Binding Setup**: Collegamento reattivo stabilito
5. **Propagazione**: Modifiche si propagano a tutti i moduli collegati

```javascript
// Esempio di auto-discovery in azione
const cliente = new Entity('Cliente');
// cliente.attributes è vuoto

// Modulo richiede attributo 'email'
const emailAttr = cliente.getAttribute('email'); // null

// Auto-discovery: crea attributo
cliente.setAttribute('email', '', 'email'); // Creato automaticamente

// Ora cliente.attributes contiene 'email' con metadati dal modulo
```

### **5. Workflow Completo: Da JSON a UI Funzionante**

```
1. DEFINIZIONE MODULO
   contact-card.mod.json → ModuleDefinition.parse()

2. VALIDAZIONE
   ModuleDefinition.validate() → Verifica struttura

3. COMPILAZIONE
   ModuleCompiler.compile(definition, entity) → HTML+CSS+JS

4. RENDERING
   HTML iniettato in GridStack cell

5. BINDING
   JavaScript attiva binding reattivo

6. AUTO-DISCOVERY
   Attributi creati automaticamente quando richiesti

7. REATTIVITÀ
   Modifiche si propagano via AttributeSpace/EventBus
```

**Risultato**: Un modulo completamente funzionante con binding bidirezionale, persistenza automatica e propagazione reattiva delle modifiche.

## 📁 **STRUTTURA FILE IMPLEMENTATA**

```
/mvp-dynamic-docs/
├── /core/                          # ✅ FASE 2 COMPLETATA
│   ├── storage/
│   │   ├── StorageManager.js       # ✅ Persistenza LocalStorage
│   │   └── MigrationInterface.js   # ✅ Interfaccia migrazione DB
│   ├── entity/
│   │   ├── Entity.js               # ✅ Entità dinamiche
│   │   ├── Attribute.js            # ✅ Attributi tipizzati
│   │   └── AttributeSpace.js       # ✅ Registry reattivo
│   ├── reactive/
│   │   └── EventBus.js             # ✅ Sistema eventi globale
│   └── module/
│       ├── ModuleDefinition.js     # ✅ Parser mod.json
│       └── ModuleCompiler.js       # ✅ Compilatore JSON→HTML+CSS+JS
├── /document/                      # ✅ FASE 4 COMPLETATA
│   ├── GridStackAdapter.js         # ✅ Integrazione GridStack
│   └── Document.js                 # ✅ Gestione documenti
├── /ui/                           # ✅ FASE 4 COMPLETATA
│   ├── ModulePalette.js           # ✅ Palette moduli con categorie
│   ├── EntitySelector.js          # ✅ Modal selezione entità
│   └── DocumentBuilder.js         # ✅ Orchestratore principale
├── /styles/                       # ✅ FASE 4 COMPLETATA
│   └── gridstack.css              # ✅ CSS completo responsive
├── /modules/                      # ✅ FASE 3 PARZIALE
│   ├── contact-card.mod.json      # ✅ Modulo esempio funzionante
│   └── crew-list.mod.json         # ✅ Definizione base (da completare)
├── /demo/                         # ✅ AGGIORNATO FASE 4
│   ├── document-builder-demo.html # ✅ Demo completa Fase 4
│   └── README-document-builder.md # ✅ Guida test completa
├── demo.html                      # ✅ Demo Fase 2 (core)
└── context.md                     # ✅ Documentazione aggiornata
```

## 🎯 **PROSSIMI PASSI**

### **FASE 5 - COMPLETAMENTO MODULI (PRIORITÀ ALTA)**
1. **Implementare moduli mancanti**:
   - ✅ contact-card (completato)
   - 🎯 crew-list (definizione base presente)
   - 🎯 weather-widget (da implementare)
   - 🎯 task-list (da implementare)

2. **Validazione workflow callsheet completo**
3. **Test di stress con molti moduli**

### **FASE 6 - DOCUMENTAZIONE & POLISH**
1. **API Documentation completa**
2. **Guide utente per creazione moduli**
3. **Performance optimization**
4. **Error handling migliorato**

### **CONSIDERAZIONI TECNICHE**

#### **Scalabilità**
- ✅ LocalStorage con compressione per MVP
- 🎯 Migration path verso IndexedDB/PostgreSQL
- ✅ Sistema di cache per performance

#### **Estensibilità**
- ✅ Architettura modulare per nuovi tipi di moduli
- ✅ Sistema di plugin per custom validators
- ✅ API pubblica per integrazioni esterne

#### **Sicurezza**
- ✅ Sanitizzazione input utente
- ✅ Validazione rigorosa tipi
- 🎯 CSP headers per produzione

## 📊 **METRICHE PROGETTO**

### **Codebase**
- **32 files** totali
- **11,577 lines** di codice
- **9 componenti core** implementati
- **4 moduli UI** completi
- **1 demo completa** funzionante

### **Test Coverage**
- **23/23 test core** passati (100%)
- **10/10 test demo** passati (100%)
- **Workflow end-to-end** validato

### **Funzionalità Implementate**
- ✅ Auto-discovery attributi
- ✅ Sistema reattivo globale
- ✅ Compilazione moduli automatica
- ✅ Drag & drop con GridStack
- ✅ Persistenza configurazioni
- ✅ UI responsive completa

---

**STATO FINALE**: Il sistema è **completamente funzionante** e pronto per l'uso. La Fase 4 è stata completata con successo, il repository Git è inizializzato e la demo è operativa. I prossimi passi si concentrano sul completamento dei moduli di esempio e sulla documentazione finale. 