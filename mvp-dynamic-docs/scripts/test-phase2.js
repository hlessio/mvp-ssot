/**
 * Phase2Tester - Test suite completa per la Fase 2 del MVP
 * Testa Storage, Entity, Reactive e Module System
 */

// Le classi sono disponibili globalmente tramite window

class Phase2Tester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runAllTests() {
        console.log('🧪 Avvio test suite completa Fase 2...\n');
        
        this.results = { passed: 0, failed: 0, tests: [] };
        
        await this.testStorageLayer();
        await this.testEntitySystem();
        await this.testReactiveSystem();
        await this.testModuleSystem();
        await this.testIntegration();
        
        this.printResults();
        
        return this.results;
    }

    async testStorageLayer() {
        console.log('📦 Testing Storage Layer...');
        
        try {
            const storage = new window.StorageManager();
            
            // Test salvataggio e caricamento
            const testData = { id: 'test1', name: 'Test Entity', value: 42 };
            await storage.save('test_entity', testData);
            this.assert(true, 'Storage: Salvataggio dati');
            
            const loaded = await storage.load('test_entity');
            this.assert(loaded && loaded.name === 'Test Entity', 'Storage: Caricamento dati');
            
            // Test query
            await storage.save('test_entity_2', { id: 'test2', type: 'Cliente', name: 'Mario' });
            const results = await storage.query({ type: 'Cliente' });
            this.assert(results.length > 0, 'Storage: Query con filtri');
            
            // Test transazioni
            const operations = [
                { type: 'save', key: 'trans1', data: { value: 1 } },
                { type: 'save', key: 'trans2', data: { value: 2 } }
            ];
            await storage.transaction(operations);
            this.assert(true, 'Storage: Transazioni');
            
            // Test statistiche
            const stats = storage.getStats();
            this.assert(stats.totalKeys > 0, 'Storage: Statistiche');
            
            // Test export/import
            const exportData = await storage.export();
            this.assert(exportData.data && exportData.version, 'Storage: Export');
            
            console.log('✅ Storage Layer test completati');
            
        } catch (error) {
            this.assert(false, `Storage Layer: ${error.message}`);
        }
    }

    async testEntitySystem() {
        console.log('🏗️ Testing Entity System...');
        
        try {
            // Test creazione entità
            const cliente = new window.Entity('Cliente');
            this.assert(cliente.id && cliente.type === 'Cliente', 'Entity: Creazione entità');
            
            // Test auto-discovery attributi
            const nomeAttr = cliente.getAttribute('nome', { autoCreate: true });
            this.assert(nomeAttr !== null, 'Entity: Auto-discovery attributi');
            
            // Test impostazione attributi con inferenza tipo
            cliente.setAttributeValue('email', 'test@esempio.com');
            const emailAttr = cliente.getAttribute('email');
            this.assert(emailAttr.type === 'email', 'Entity: Inferenza tipo email');
            
            cliente.setAttributeValue('eta', 30);
            const etaAttr = cliente.getAttribute('eta');
            this.assert(etaAttr.type === 'integer', 'Entity: Inferenza tipo numero');
            
            // Test validazione
            const validation = cliente.validate();
            this.assert(validation.isValid !== undefined, 'Entity: Validazione');
            
            // Test serializzazione
            const serialized = cliente.serialize();
            this.assert(serialized.id === cliente.id, 'Entity: Serializzazione');
            
            const deserialized = window.Entity.deserialize(serialized);
            this.assert(deserialized.id === cliente.id, 'Entity: Deserializzazione');
            
            console.log('✅ Entity System test completati');
            
        } catch (error) {
            this.assert(false, `Entity System: ${error.message}`);
        }
    }

    async testReactiveSystem() {
        console.log('⚡ Testing Reactive System...');
        
        try {
            const eventBus = new window.EventBus();
            
            // Test eventi base
            let eventReceived = false;
            const unsubscribe = eventBus.on('test:event', (data) => {
                eventReceived = true;
            });
            
            await eventBus.emit('test:event', { message: 'test' });
            this.assert(eventReceived, 'EventBus: Emissione e ricezione eventi');
            
            // Test eventi once
            let onceCount = 0;
            eventBus.once('test:once', () => {
                onceCount++;
            });
            
            await eventBus.emit('test:once');
            await eventBus.emit('test:once');
            this.assert(onceCount === 1, 'EventBus: Eventi once');
            
            // Test statistiche
            const stats = eventBus.getStats();
            this.assert(stats.totalEvents >= 0, 'EventBus: Statistiche');
            
            unsubscribe();
            console.log('✅ Reactive System test completati');
            
        } catch (error) {
            this.assert(false, `Reactive System: ${error.message}`);
        }
    }

    async testModuleSystem() {
        console.log('🧩 Testing Module System...');
        
        try {
            // Test ModuleDefinition
            const moduleData = {
                module_id: 'test-module',
                version: '1.0.0',
                name: 'Test Module',
                slots: {
                    nome: { path: 'Cliente.nome', type: 'text', editable: true },
                    email: { path: 'Cliente.email', type: 'email', editable: true }
                },
                layout: {
                    type: 'card',
                    elements: [
                        { element: 'h3', slot: 'nome' },
                        { element: 'input', slot: 'email', attributes: { type: 'email' } }
                    ]
                },
                styling: { theme: 'modern', spacing: 'normal' }
            };
            
            const moduleDef = new window.ModuleDefinition(moduleData);
            this.assert(moduleDef.moduleId === 'test-module', 'ModuleDefinition: Parsing');
            
            const validation = moduleDef.validate();
            this.assert(validation.isValid, 'ModuleDefinition: Validazione');
            
            const requiredAttrs = moduleDef.getRequiredAttributes();
            this.assert(requiredAttrs.includes('nome'), 'ModuleDefinition: Attributi richiesti');
            
            // Test ModuleCompiler
            const compiler = new window.ModuleCompiler();
            const compiled = await compiler.compile(moduleDef);
            
            this.assert(compiled.html && compiled.html.includes('<h3'), 'ModuleCompiler: Generazione HTML');
            this.assert(compiled.css && compiled.css.includes('.test-module'), 'ModuleCompiler: Generazione CSS');
            this.assert(compiled.js && compiled.js.includes('function'), 'ModuleCompiler: Generazione JS');
            
            console.log('✅ Module System test completati');
            
        } catch (error) {
            this.assert(false, `Module System: ${error.message}`);
        }
    }

    async testIntegration() {
        console.log('🔗 Testing Integration...');
        
        try {
            // Test integrazione completa: Entity + Module + Reactive
            const storage = new window.StorageManager();
            
            // Crea entità
            const cliente = new window.Entity('Cliente');
            cliente.setAttributeValue('nome', 'Mario Rossi');
            cliente.setAttributeValue('email', 'mario@esempio.com');
            
            // Salva entità
            await storage.save(`entity_${cliente.id}`, cliente.serialize());
            
            // Test modulo con entità reale
            const moduleData = {
                module_id: 'integration-test',
                version: '1.0.0',
                slots: {
                    nome: { path: 'Cliente.nome', type: 'text' },
                    email: { path: 'Cliente.email', type: 'email' }
                },
                layout: {
                    type: 'card',
                    elements: [
                        { element: 'div', slot: 'nome' },
                        { element: 'div', slot: 'email' }
                    ]
                }
            };
            
            const moduleDef = new window.ModuleDefinition(moduleData);
            const compiler = new window.ModuleCompiler();
            const compiled = await compiler.compile(moduleDef, { entity: cliente });
            
            this.assert(compiled.html.includes('Mario Rossi'), 'Integration: Dati entità in modulo');
            
            console.log('✅ Integration test completati');
            
        } catch (error) {
            this.assert(false, `Integration: ${error.message}`);
        }
    }

    assert(condition, testName) {
        if (condition) {
            this.results.passed++;
            console.log(`  ✅ ${testName}`);
        } else {
            this.results.failed++;
            console.log(`  ❌ ${testName}`);
        }
        
        this.results.tests.push({
            name: testName,
            passed: condition
        });
    }

    printResults() {
        console.log('\n📊 Risultati Test Suite:');
        console.log(`✅ Passati: ${this.results.passed}`);
        console.log(`❌ Falliti: ${this.results.failed}`);
        console.log(`📈 Totale: ${this.results.passed + this.results.failed}`);
        
        if (this.results.failed === 0) {
            console.log('🎉 Tutti i test sono passati!');
        } else {
            console.log('⚠️ Alcuni test sono falliti. Controlla l\'implementazione.');
        }
    }
}

// Export per uso in browser
if (typeof window !== 'undefined') {
    window.Phase2Tester = Phase2Tester;
} 