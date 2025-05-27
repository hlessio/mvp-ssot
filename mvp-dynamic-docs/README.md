# MVP Dynamic Docs - Piattaforma Documenti Dinamici

## 📜 Panoramica del Progetto

MVP Dynamic Docs è una piattaforma sperimentale progettata per creare "documenti viventi" – applicazioni web dinamiche che si aggiornano automaticamente al variare dei dati sottostanti. Ogni documento è composto da moduli riutilizzabili che si collegano a una fonte di verità unica (Single Source of Truth - SSOT), garantendo coerenza e reattività in tempo reale.

L'obiettivo è fornire un sistema leggero, basato su HTML, CSS e JavaScript vanilla, che permetta di costruire interfacce modulari e data-driven senza la complessità dei moderni framework frontend.

## ✨ Funzionalità Chiave

- **Sistema a Entità Evolutive**: Le entità (es. Cliente, Prodotto) acquisiscono attributi dinamicamente quando interagiscono con i moduli.
- **Moduli Declarativi**: I componenti UI (moduli) sono definiti tramite semplici file `.mod.json`.
- **Compilazione Automatica**: I file `.mod.json` vengono compilati automaticamente in HTML, CSS e JavaScript pronti all'uso.
- **Reattività Globale**: Le modifiche ai dati si propagano istantaneamente a tutti i moduli che visualizzano tali dati, grazie a un `AttributeSpace` centrale e un `EventBus`.
- **Istanze di Modulo Persistenti (SSOT)**: Ogni modulo può avere istanze multiple, ognuna con un ID univoco, stato persistente e entità collegate specifiche. Queste istanze sono dei veri e propri Single Source of Truth.
- **Caricamento Dinamico dei Moduli**: I moduli vengono scoperti e caricati dinamicamente al bisogno.
- **Persistenza Dati**: Le entità e le istanze dei moduli vengono salvate in LocalStorage, con un'interfaccia di migrazione per futuri database.
- **Interfaccia Semplice (stile Google Sheets)**: Per moduli come `entity-list`, l'interfaccia utente è minimale e intuitiva, con creazione e modifica diretta.

## 🏗️ Architettura Implementata

Il sistema è suddiviso in diversi componenti core:

1.  **Storage Layer (`StorageManager.js`, `MigrationInterface.js`)**:
    *   Gestisce la persistenza dei dati (attualmente LocalStorage).
    *   Include un sistema di transazioni e un'interfaccia per future migrazioni a database più robusti.

2.  **Entity System (`Entity.js`, `Attribute.js`, `AttributeSpace.js`, `EntityManager.js`)**:
    *   `Entity.js`: Rappresenta oggetti di dati dinamici con attributi che possono essere aggiunti al volo.
    *   `Attribute.js`: Definisce i singoli attributi con tipi, validatori e trasformatori.
    *   `AttributeSpace.js`: Un registro globale che traccia tutti gli attributi e gestisce la reattività, propagando i cambiamenti.
    *   `EntityManager.js`: Gestisce il ciclo di vita delle entità, inclusa la creazione, il salvataggio (con debounce) e il caricamento automatico.

3.  **Reactive System (`EventBus.js`)**:
    *   Un sistema di eventi globale avanzato per la comunicazione disaccoppiata tra componenti.

4.  **Module System (`ModuleDefinition.js`, `ModuleCompiler.js`, `ModuleLoader.js`, `ModuleInstance.js`)**:
    *   `ModuleDefinition.js`: Parsa e valida i file di definizione dei moduli (`.mod.json`).
    *   `ModuleCompiler.js`: Compila le definizioni dei moduli in HTML, CSS e JavaScript eseguibile.
    *   `ModuleLoader.js`: Scopre e carica dinamicamente i moduli dalla directory `/modules/`, gestendo una cache.
    *   `ModuleInstance.js`: Permette la creazione di istanze persistenti e uniche per ogni modulo, ognuna con le proprie entità collegate e stato salvato (SSOT per modulo).

5.  **Document System & UI (per demo più complesse come `document-builder-demo.html`)**:
    *   `Document.js`: Gestisce la composizione di più moduli in un documento.
    *   `GridStackAdapter.js`: Integra la libreria GridStack per layout drag & drop.
    *   Componenti UI come `ModulePalette.js`, `EntitySelector.js`, `DocumentBuilder.js`.

## 🚀 Come Eseguire le Demo

1.  **Prerequisiti**:
    *   Un server web locale. Python `http.server` è una scelta semplice.
    *   Un browser web moderno.

2.  **Avviare il Server**:
    *   Naviga nella directory principale del progetto (`MVP-modularssot/mvp-dynamic-docs`).
    *   Esegui il comando: `python3 -m http.server 8001` (o un'altra porta se la 8001 è occupata).

3.  **Accedere alle Demo**:

    *   **Demo Semplificata con Entity List (SSOT)**:
        *   Apri il browser e vai a: `http://localhost:8001/demo/simple-builder-demo.html`
        *   Questa demo mostra il modulo `entity-list` con istanze persistenti. Puoi aggiungere/modificare entità e attributi. *Nota: la persistenza completa delle entità tra i ricaricamenti è attualmente in fase di debug.*

    *   **Demo Completa Document Builder**:
        *   Apri il browser e vai a: `http://localhost:8001/demo/document-builder-demo.html`
        *   Questa demo mostra un'interfaccia più complessa per costruire documenti trascinando moduli su una griglia.

## 📊 Stato Attuale del Progetto (Aggiornamento 27 Maggio 2025)

### Milestone Raggiunte
- ✅ Core System completo (Storage, Entity, Reactive, Module System).
- ✅ Document Builder con GridStack (Demo funzionante).
- ✅ Sistema `ModuleInstance` per SSOT persistente dei moduli.
- ✅ Demo `simple-builder-demo.html` con `entity-list` e istanze SSOT.
- ✅ Repository Git inizializzato e aggiornato su [https://github.com/hlessio/mvp-ssot](https://github.com/hlessio/mvp-ssot).

### Work In Progress (Problemi Noti)
- 🚧 **Persistenza Entità tra Ricaricamenti**: Le entità create/modificate nel modulo `entity-list` non vengono sempre ricaricate correttamente dopo un refresh della pagina. Il collegamento tra `ModuleInstance` e le sue `Entity` persistite necessita di ulteriore debug.
- 🚧 **EntityManager Reload**: Il caricamento automatico delle entità da parte dell'`EntityManager` all'avvio potrebbe non funzionare come previsto in tutti gli scenari con `ModuleInstance`.

## 🛠️ Tecnologie Utilizzate

-   HTML5
-   CSS3
-   JavaScript (Vanilla ES6+)
-   GridStack.js (per la demo `document-builder`)
-   Nessun framework frontend complesso.

## 🛣️ Prossimi Passi e Miglioramenti Futuri

-   **Risolvere i problemi di persistenza** con `ModuleInstance` e `EntityManager`.
-   Completare l'implementazione di altri moduli di esempio (crew-list, weather-widget, task-list).
-   Validare il workflow completo per scenari d'uso complessi (es. Callsheet).
-   Migliorare la documentazione API.
-   Ottimizzare le performance.
-   Potenziare il sistema di gestione degli errori.
-   Esplorare opzioni di persistenza più robuste (es. IndexedDB, backend database).

---
*Questo README è stato generato il 27 Maggio 2025.* 