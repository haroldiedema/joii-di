test('JOII DI - Container', function(assert) {

    // Test Services
    _g.TestSuite = {

        // Contains native javascript functions to be used as services.
        Native : {
            Simple1: function(a, b) { this.a = a; this.b = b; },
            Simple2: function(a, b) { this.a = a; this.b = b; },
            Methods1: function() {
                this.a = null;
                this.b = null;
                this.c = null;
                this.d = null;
                this.setSimple1 = function(a) { this.a = a; };
                this.setSimple2 = function(b,c,d) { this.b = b; this.c = c; this.d = d; };
            }
        }
    };

    var container = new DependencyInjection.Container();

    // Test Definition setters & getters
    var d1 = container.register('test_native.simple1', 'TestSuite.Native.Simple1');
    var d2 = new DependencyInjection.Definition('TestSuite.Native.Simple2');
    var d3 = new DependencyInjection.Definition('TestSuite.Native.Simple1');
    var d4 = new DependencyInjection.Definition('TestSuite.Native.Simple2');
    d3.addTag('test_tag1', 'hello'); d4.addTag('test_tag1', 'world');

    container.setDefinitions({ 'test_native.simple1' : d1, 'test_native.simple2' : d2});
    assert.strictEqual(container.hasDefinition('test_native.simple1'), true, 'test_native.simple1 is registered.');
    assert.strictEqual(container.hasDefinition('test_native.simple2'), true, 'test_native.simple2 is registered.');
    container.addDefinitions({ 'test_native.simple3': d3 });
    assert.strictEqual(container.hasDefinition('test_native.simple3'), true, 'test_native.simple3 is registered.');
    container.setDefinition('test_native.simple4', d4);
    assert.strictEqual(container.hasDefinition('test_native.simple4'), true, 'test_native.simple4 is registered.');
    var g1 = container.getDefinition('test_native.simple1');
    var g2 = container.getDefinition('test_native.simple2');
    assert.deepEqual(g1, d1, 'Grabbed Definition is equal to the created one (d1)');
    assert.deepEqual(g2, d2, 'Grabbed Definition is equal to the created one (d2)');

    // Find tagged service ids
    var tagged = container.findTaggedServiceIds('test_tag1');
    assert.strictEqual(tagged['test_native.simple3'][0], 'hello', 'Tagged service simple3 found, correct attribute.');
    assert.strictEqual(tagged['test_native.simple4'][0], 'world', 'Tagged service simple4 found, correct attribute.');

    // Parameter test
    container.setParameters({ a: 1, b: 2 });
    assert.strictEqual(container.hasParameter('a'), true, 'Parameter A registered.');
    assert.strictEqual(container.hasParameter('b'), true, 'Parameter B registered.');
    assert.strictEqual(container.getParameter('a'), 1, 'Parameter A returns correct value.');
    assert.strictEqual(container.getParameter('b'), 2, 'Parameter B returns correct value.');
    assert.throws(function() { container.getParameter('c'); }, new Error('Parameter c does not exist.'), 'Throws correct exception when fetching non-existent paremeter.');

    // Retrieval test
    d1.setArguments([1, 2]); var i1 = container.get('test_native.simple1'); // d1
    assert.strictEqual(i1.a, 1, 'Argument #1 passed correctly to constructor');
    assert.strictEqual(i1.b, 2, 'Argument #2 passed correctly to constructor');

    // Reference test
    container = new DependencyInjection.Container();
    d1 = container.register('test_native.simple1', 'TestSuite.Native.Simple1'); d1.setArguments([1, 2]);
    d2 = container.register('test_native.simple2', 'TestSuite.Native.Simple2');
    d3 = new DependencyInjection.Definition('TestSuite.Native.Simple1');
    d4 = new DependencyInjection.Definition('TestSuite.Native.Simple2');
    container.addDefinitions({ 'test_native.simple3': d3 });
    container.setDefinition('test_native.simple4', d4);
    container.setParameter('test.arg', 'foobar');
    d2.addArgument('@test_native.simple1'); d2.addArgument('%test.arg%');
    var i2 = container.get('test_native.simple2'); // d2
    assert.strictEqual(i2.a.a, 1, 'Reference to another service passed correctly #1.');
    assert.strictEqual(i2.a.b, 2, 'Reference to another service passed correctly #2.');
    assert.strictEqual(i2.b, 'foobar', 'Argument #2 to i2 passed correctly from parameters.');

    // Circular Reference Test
    assert.throws(function() {
        d3.addArgument('@test_native.simple4');
        d4.addArgument('@test_native.simple3');
        container.get('test_native.simple4');
    }, new Error('Service test_native.simple4 has a circular reference to itself.'), 'Circular reference exception thrown correctly.');

    // MethodCall test
    container = new DependencyInjection.Container();
    d1 = container.register('test_native.simple1', 'TestSuite.Native.Simple1'); d1.setArguments([1, 2]);
    d2 = container.register('test_native.simple2', 'TestSuite.Native.Simple2');
    d3 = new DependencyInjection.Definition('TestSuite.Native.Simple1');
    d4 = new DependencyInjection.Definition('TestSuite.Native.Simple2');
    container.addDefinitions({ 'test_native.simple3': d3 });
    container.setDefinition('test_native.simple4', d4);
    container.setParameter('test.arg', 'foobar');
    var d5 = container.register('test_native.methods1', 'TestSuite.Native.Methods1');
    d5.addMethodCall('setSimple1', ['@test_native.simple1']);
    d5.addMethodCall('setSimple2', ['@test_native.simple2', '%test.arg%', 123]);
    var i5 = container.get('test_native.methods1');
    assert.deepEqual(i5.a, container.get('test_native.simple1'), 'MethodCall setSimple1 executed correctly.');
    assert.deepEqual(i5.b, container.get('test_native.simple2'), 'MethodCall setSimple2 executed correctly.');
    assert.strictEqual(i5.c, container.getParameter('test.arg'), 'MethodCall parameter passed correctly');
    assert.strictEqual(i5.d, 123, 'MethodCall scalar parameter passed correctly.');
});
