test('JOII DI - Definition', function(assert) {

    // Locals
    var exception_str = '',
        definition    = DependencyInjection.Definition;

    // Test exceptions if invalid or malformed parameters are passed to the
    // constructor of the Definition class.
    try { new definition('i_dont_exist'); } catch (e) { exception_str = e.message; }
    assert.strictEqual(exception_str, 'i_dont_exist is undefined or not a function.', 'Test exception for undefined function as string reference.');
    try { new definition('i.dont.exist'); } catch (e) { exception_str = e.message; }
    assert.strictEqual(exception_str, 'i is undefined or not iterable.', 'Test undefined function as string reference with namespaces.');

    // Declare a simple test service as a single function.
    var def = new definition(function() {});

    assert.strictEqual(def.getArguments().length, 0, 'Initially, the argument array should be empty.');

    // Test functionality of "argument" functions.
    def.addArgument('first');
    def.addArgument('second');
    assert.strictEqual(def.getArguments()[0], 'first', 'Test passed argument #1');
    assert.strictEqual(def.getArguments()[1], 'second', 'Test passed argument #2');
    assert.strictEqual(def.getArguments().length, 2, 'Test total count of arguments.');
    def.setArguments([1, 2, 'third']);
    assert.strictEqual(def.getArguments()[0], 1, 'Test overridden passed argument #1');
    assert.strictEqual(def.getArguments()[1], 2, 'Test overridden passed argument #2');
    assert.strictEqual(def.getArguments()[2], 'third', 'Test overridden passed argument #3');
    assert.strictEqual(def.getArguments().length, 3, 'Test total count of arguments.');

    // Test functionality of methodCalls.
    def.addMethodCall('methodA');
    def.addMethodCall('methodB', [1, 2]);
    assert.strictEqual(def.hasMethodCall('methodA'), true, 'hasMethodCall, methodA: true');
    assert.strictEqual(def.hasMethodCall('methodB'), true, 'hasMethodCall, methodB: true');
    assert.strictEqual(def.hasMethodCall('methodC'), false, 'hasMethodCall, methodC: false');
    assert.strictEqual(def.getMethodCalls()[0][0], 'methodA', 'Retrieve call reference to methodA.');
    assert.strictEqual(def.getMethodCalls()[1][0], 'methodB', 'Retrieve call reference to methodB.');
    assert.strictEqual(def.getMethodCalls()[2], undefined, 'Retrieve call reference to methodC (undefined).');
    assert.deepEqual(def.getMethodCalls()[1][1], [1, 2], 'Retrieve arguments for methodB.');

    // Test removal of methodCall
    def.removeMethodCall('methodA');
    assert.strictEqual(def.hasMethodCall('methodA'), false, 'hasMethodCall, methodA: false - removed.');

    // Override method calls
    def.setMethodCalls([
        ['method1', [1, 2]],
        ['method2', [3, 4]]
    ]);
    assert.strictEqual(def.hasMethodCall('methodB'), false, 'hasMethodCall, methodB: false - removed - overridden.');
    assert.strictEqual(def.hasMethodCall('method1'), true, 'hasMethodCall, method1: true');
    assert.strictEqual(def.hasMethodCall('method2'), true, 'hasMethodCall, method2: true');

    // Test tags
    assert.deepEqual(def.getTags(), {}, 'Initial tags is empty');
    def.setTags({ tag1: [], tag2: [1, 2] });
    assert.strictEqual(def.hasTag('tag1'), true, 'hasTag: tag1 - true');
    assert.strictEqual(def.hasTag('tag2'), true, 'hasTag: tag2 - true');
    assert.deepEqual(def.getTag('tag2'), [1, 2], 'getTag: tag2 - [1, 2]');
    assert.deepEqual(def.getTags(), { tag1: [], tag2: [1, 2] }, 'getTags');
    def.clearTag('tag2');
    assert.strictEqual(def.hasTag('tag2'), false, 'hasTag: tag2 - false');
    def.clearTags();
    assert.strictEqual(def.hasTag('tag1'), false, 'hasTag: tag1 - false');
    assert.deepEqual(def.getTags(), {}, 'No more tags - cleared all.');
    def.addTag('tag3', ['a', 'b']);
    assert.strictEqual(def.hasTag('tag3'), true, 'hasTag: tag3 - true, added with addTag');
    assert.deepEqual(def.getTag('tag3'), [['a', 'b']], 'getTag: tag3 - [a, b]');
    def.addTag('tag3', [1, 2]);
    assert.deepEqual(def.getTag('tag3'), [['a', 'b'], [1, 2]], 'getTag: tag3 - [a, b], [1, 2]');

    // Public flag
    assert.strictEqual(def.isPublic(), true, 'Initially, a definition is public');
    def.setPublic(false);
    assert.strictEqual(def.isPublic(), false, 'Definition is now private.');

});
