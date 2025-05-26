# Document Builder Demo - Guida ai Test

## Panoramica
Questa demo testa completamente il sistema **Document Builder** implementato nella Fase 4, che include:

- **GridStack Integration**: Sistema di griglia drag & drop
- **Module Palette**: Palette moduli con categorie e ricerca
- **Entity Selector**: Selettore entità con modal e filtri
- **Document Management**: Creazione, salvataggio e caricamento documenti
- **Workflow Completo**: Drag & drop moduli → selezione entità → rendering

## Come Utilizzare la Demo

### 1. Apertura
```bash
# Apri il file nel browser
open mvp-dynamic-docs/demo/document-builder-demo.html
```

### 2. Interfaccia
- **Area Principale**: Document Builder con toolbar, sidebar e griglia
- **Palette Moduli**: Sidebar sinistra con moduli disponibili
- **Panel Test**: Pannello destro con suite di test automatici
- **Toolbar**: Controlli documento (nuovo, apri, salva, esporta)

### 3. Test Automatici
Clicca sul pulsante **"Test"** in alto a destra per aprire il panel dei test.

#### Test Disponibili:

**Inizializzazione**
- ✅ Test Inizializzazione: Verifica che DocumentBuilder sia inizializzato
- ✅ Verifica Componenti: Controlla che tutti i componenti siano caricati

**Document Management**
- 📄 Nuovo Documento: Crea un nuovo documento vuoto
- 💾 Salva Documento: Salva il documento corrente
- 📂 Carica Documento: Apre dialog per caricare documento esistente

**Module Palette**
- 🎨 Test Palette: Verifica funzionamento palette moduli
- 🔍 Test Ricerca: Testa la ricerca moduli
- 📂 Test Categorie: Verifica organizzazione per categorie

**Entity Selector**
- 👤 Apri Selettore: Apre il modal di selezione entità
- ➕ Crea Entità: Crea entità di test
- 🔧 Test Filtri: Testa filtri per tipo e ricerca

**Drag & Drop**
- 🖱️ Simula Drag & Drop: Simula trascinamento modulo
- ➕ Aggiungi Modulo: Aggiunge modulo programmaticamente
- 📐 Test Layout: Verifica persistenza layout GridStack

**Test Completo**
- 🚀 **Test Completo**: Esegue tutti i test in sequenza automaticamente

## Workflow di Test Manuale

### 1. Test Base
1. Apri la demo
2. Clicca "Test Completo" per verificare che tutto funzioni
3. Verifica che tutti i test passino (dovrebbero essere 10/10)

### 2. Test Drag & Drop Manuale
1. Nella palette sinistra, trascina un modulo (es. "Contact Card")
2. Rilascialo nell'area della griglia
3. Si dovrebbe aprire il selettore entità
4. Seleziona o crea un'entità
5. Il modulo dovrebbe apparire nella griglia

### 3. Test Entity Selector
1. Clicca "Apri Selettore" nei test
2. Verifica che il modal si apra
3. Testa la ricerca digitando nel campo
4. Testa i filtri per tipo
5. Clicca "Crea Nuova Entità" per testare la creazione

### 4. Test Module Palette
1. Verifica che ci siano 4 moduli di esempio:
   - 👤 Contact Card (categoria: contact)
   - 👥 Crew List (categoria: production)
   - 🌤️ Weather Widget (categoria: production)
   - ✅ Task List (categoria: productivity)
2. Testa la ricerca digitando "contact"
3. Testa i filtri per categoria

### 5. Test Document Management
1. Clicca "Nuovo" nella toolbar per creare nuovo documento
2. Aggiungi alcuni moduli
3. Clicca "Salva" per salvare
4. Clicca "Apri" per vedere documenti salvati
5. Testa "Esporta" per export JSON

### 6. Test Responsive
1. Ridimensiona la finestra del browser
2. Verifica che l'interfaccia si adatti
3. Su mobile, la sidebar dovrebbe collassare

## Componenti Testati

### Core Components (Fase 2)
- ✅ StorageManager: Persistenza LocalStorage
- ✅ EventBus: Sistema eventi globale
- ✅ AttributeSpace: Registry attributi reattivo
- ✅ Entity/Attribute: Sistema entità dinamiche
- ✅ ModuleCompiler: Compilazione JSON → HTML+CSS+JS

### Document System (Fase 4)
- ✅ GridStackAdapter: Integrazione GridStack
- ✅ Document: Gestione documenti e moduli
- ✅ ModulePalette: Palette moduli con categorie
- ✅ EntitySelector: Modal selezione entità
- ✅ DocumentBuilder: Orchestratore principale

## Risultati Attesi

### Test Automatici
Tutti i 10 test dovrebbero passare:
```
🏁 TEST COMPLETATO: 10/10 passati
🎉 TUTTI I TEST SONO PASSATI!
✅ Sistema Document Builder funzionante
```

### Funzionalità Verificate
- ✅ Inizializzazione completa di tutti i componenti
- ✅ Caricamento 4 moduli di esempio con categorie
- ✅ Creazione e gestione documenti
- ✅ Drag & drop moduli dalla palette alla griglia
- ✅ Selezione entità con modal e filtri
- ✅ Rendering moduli compilati in celle GridStack
- ✅ Persistenza layout e documenti
- ✅ Sistema reattivo con eventi globali

## Troubleshooting

### Errori Comuni

**"DocumentBuilder non inizializzato"**
- Verifica che tutti i file JS siano caricati
- Controlla la console per errori di caricamento

**"Componenti NON caricati"**
- Verifica i path dei file JavaScript
- Controlla che GridStack CDN sia accessibile

**"Nessun modulo disponibile"**
- I moduli di esempio dovrebbero caricarsi automaticamente
- Verifica che ModulePalette.loadExampleModules() funzioni

**Modal non si apre**
- Verifica che EntitySelector sia inizializzato
- Controlla che non ci siano errori JavaScript

### Debug
- Apri Developer Tools (F12)
- Tutti gli eventi sono loggati nella console con prefisso `[EVENT]`
- I test loggano dettagli con prefisso `[TEST]`

## Prossimi Passi

Dopo aver verificato che tutti i test passano:

1. **Fase 5 - Testing & Integration**: Test più approfonditi e edge cases
2. **Fase 6 - Demo & Deployment**: Demo completa e preparazione produzione
3. **Documentazione**: API reference e guide utente
4. **Performance**: Ottimizzazioni e test di carico

## Note Tecniche

### Dipendenze
- **GridStack 9.2.0**: Libreria griglia drag & drop
- **Vanilla JavaScript**: Nessun framework aggiuntivo
- **LocalStorage**: Persistenza dati lato client

### Browser Supportati
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Limitazioni Note
- LocalStorage limitato a ~5-10MB
- Drag & drop richiede mouse (touch in sviluppo)
- Modal non supporta keyboard navigation completa 