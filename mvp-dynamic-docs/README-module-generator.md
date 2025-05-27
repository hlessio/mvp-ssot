# 🚀 Generatore Moduli e Visualizzatore Documenti

## Panoramica

Il sistema di generazione moduli permette di creare rapidamente moduli dinamici e testarli immediatamente in un ambiente full-screen. È composto da due componenti principali:

1. **Module Generator** (`module-generator-test.html`) - Interfaccia per creare moduli
2. **Document Viewer** (`module-document-viewer.html`) - Visualizzatore full-screen per documenti

## 🎯 Caratteristiche Principali

### Generatore Moduli
- ✅ **Template Predefiniti**: Contact Card, Crew Member, Task Item, Weather Widget
- ✅ **Generazione Automatica**: Da form a definizione JSON completa
- ✅ **Validazione Real-time**: Controllo immediato della struttura
- ✅ **Anteprima Live**: Visualizzazione del JSON generato
- ✅ **Test Immediato**: Apertura automatica in nuova scheda

### Visualizzatore Documenti
- ✅ **Layout Full-Screen**: Design responsive e adattivo
- ✅ **Auto-Save**: Salvataggio automatico ogni 30 secondi
- ✅ **Shortcuts Tastiera**: Ctrl+S (salva), Ctrl+R (aggiorna), Esc (chiudi)
- ✅ **Export/Import**: Esportazione dati in formato JSON
- ✅ **Sistema Reattivo**: Aggiornamenti in tempo reale

## 🚀 Come Utilizzare

### 1. Avviare il Generatore

```bash
# Apri il file nel browser
open mvp-dynamic-docs/module-generator-test.html
```

### 2. Creare un Modulo

1. **Seleziona Tipo Modulo**: Scegli tra i template predefiniti o "Personalizzato"
2. **Configura Entità**: Specifica il nome dell'entità (es. "Cliente", "Persona")
3. **Definisci Campi**: Modifica il JSON dei campi secondo le tue esigenze
4. **Genera Modulo**: Clicca "🔧 Genera Modulo" per creare la definizione
5. **Valida**: Usa "✅ Valida Modulo" per verificare la correttezza
6. **Testa**: Clicca "🚀 Test in Nuova Scheda" per aprire il documento

### 3. Lavorare con il Documento

Una volta aperto il documento nel visualizzatore:

- **Modifica Dati**: I campi sono editabili e si salvano automaticamente
- **Salvataggio Manuale**: Usa `Ctrl+S` o il pulsante "💾 Salva"
- **Esportazione**: Clicca "📤 Esporta" per scaricare i dati JSON
- **Aggiornamento**: Usa `Ctrl+R` o "🔄 Aggiorna" per ricaricare
- **Chiusura**: Premi `Esc` o clicca la "×" per chiudere

## 📋 Template Disponibili

### 1. Contact Card (Scheda Contatto)
```json
{
  "nome": "text",
  "email": "email",
  "telefono": "text",
  "azienda": "text",
  "ruolo": "text",
  "note": "textarea"
}
```

### 2. Crew Member (Membro Crew)
```json
{
  "nome": "text",
  "ruolo": "text",
  "telefono": "text",
  "email": "email",
  "disponibilita": "text",
  "note": "textarea"
}
```

### 3. Task Item
```json
{
  "titolo": "text",
  "descrizione": "textarea",
  "priorita": "select",
  "scadenza": "date",
  "assegnato": "text",
  "stato": "select"
}
```

## 🔧 Personalizzazione Avanzata

### Tipi di Campo Supportati

- `text` - Campo testo semplice
- `email` - Campo email con validazione
- `textarea` - Area di testo multi-riga
- `date` - Selettore data
- `select` - Menu a tendina
- `number` - Campo numerico
- `integer` - Campo numero intero
- `url` - Campo URL
- `boolean` - Campo checkbox/switch
- `password` - Campo password

### Struttura JSON Modulo

```json
{
  "module_id": "unique-id",
  "version": "1.0.0",
  "metadata": {
    "name": "Nome Modulo",
    "description": "Descrizione del modulo",
    "category": "Contact|Production|Task|Utility",
    "author": "Module Generator"
  },
  "slots": {
    "campo1": {
      "path": "Entita.campo1",
      "type": "text",
      "editable": true,
      "required": true,
      "label": "Etichetta Campo",
      "placeholder": "Testo placeholder"
    }
  },
  "layout": {
    "type": "card",
    "elements": [...]
  },
  "styling": {
    "theme": "modern",
    "spacing": "normal",
    "responsive": true
  }
}
```

## 🎨 Personalizzazione Styling

Il sistema supporta diversi temi e opzioni di spacing:

### Temi Disponibili
- `modern` - Design moderno con gradienti
- `minimal` - Design pulito e minimale
- `classic` - Stile classico

### Opzioni Spacing
- `compact` - Spaziatura ridotta
- `normal` - Spaziatura standard
- `relaxed` - Spaziatura ampia

## 🔍 Debug e Troubleshooting

### Log del Generatore
Il generatore include un sistema di logging completo:
- **INFO**: Operazioni normali
- **SUCCESS**: Operazioni completate con successo
- **WARNING**: Avvisi non critici
- **ERROR**: Errori che richiedono attenzione

### Errori Comuni

1. **"Formato JSON non valido"**
   - Verifica la sintassi JSON nei campi
   - Usa virgole e parentesi graffe correttamente

2. **"Parametri URL mancanti"**
   - Il visualizzatore richiede parametri specifici nell'URL
   - Usa sempre il pulsante "Test in Nuova Scheda"

3. **"Modulo non valido"**
   - Usa il pulsante "Valida Modulo" per dettagli
   - Verifica che tutti i campi obbligatori siano presenti

## 💡 Best Practices

### Progettazione Moduli
1. **Nomi Descrittivi**: Usa nomi chiari per campi e entità
2. **Validazione**: Specifica sempre il tipo corretto per ogni campo
3. **Required Fields**: Marca come required solo i campi essenziali
4. **Placeholder**: Fornisci placeholder utili per guidare l'utente

### Gestione Dati
1. **Salvataggio Frequente**: Il sistema salva automaticamente, ma usa Ctrl+S per sicurezza
2. **Export Regolare**: Esporta i dati importanti per backup
3. **Naming Convention**: Usa nomi consistenti per entità e attributi

### Performance
1. **Campi Limitati**: Non superare 10-15 campi per modulo
2. **Dati Ragionevoli**: Evita testi eccessivamente lunghi nei textarea
3. **Browser Moderni**: Usa browser aggiornati per prestazioni ottimali

## 🔗 Integrazione con Sistema Core

Il generatore è completamente integrato con il sistema core MVP:

- **Entity System**: Auto-discovery degli attributi
- **Reactive System**: Propagazione automatica delle modifiche
- **Storage System**: Persistenza automatica in LocalStorage
- **Module Compiler**: Compilazione da JSON a HTML+CSS+JS

## 📊 Monitoraggio

Il sistema fornisce metriche in tempo reale:
- Numero di moduli generati
- Numero di test eseguiti
- Status del sistema
- Timestamp ultimo aggiornamento

## 🚀 Prossimi Sviluppi

- [ ] Editor visuale drag & drop per layout
- [ ] Libreria di componenti UI avanzati
- [ ] Sistema di temi personalizzabili
- [ ] Export verso framework esterni (React, Vue)
- [ ] Collaborazione multi-utente in tempo reale

---

**Nota**: Questo sistema è parte del progetto MVP Dynamic Docs e rappresenta la Fase 5 dell'implementazione. Per informazioni complete sul progetto, consulta `context.md`. 