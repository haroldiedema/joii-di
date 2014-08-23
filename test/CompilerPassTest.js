test('JOII DI - CompilerPass', function(assert) {

    var container = new DependencyInjection.Container();

    // Test definitions
    container.register('s1', function(){ this.m1 = function() {}; }).addTag('tag1');
    container.register('s2', function(){ this.m1 = function() {}; }).addTag('tag1');
    container.register('s3', function(){}).addTag('tag2');
    container.register('s4', function(){}).addTag('tag2');

    // Compiler Pass
    container.addCompilerPass(function() {
        this.compile = function(container)
        {
            container.register('cp_service', function(){});
            tagged_services = container.findTaggedServiceIds('tag1');

            for (var i in tagged_services) {
                if (!tagged_services.hasOwnProperty(i)) {
                    continue;
                }
                var def = container.getDefinition(i);
                def.addMethodCall('m1');
            }
        };
    });

    container.addCompilerPass(function() {
        this.compile = function(container)
        {
            tagged_services = container.findTaggedServiceIds('tag2');

            for (var i in tagged_services) {
                if (!tagged_services.hasOwnProperty(i)) {
                    continue;
                }
                var def = container.getDefinition(i);
                def.setPublic(false);
            }
        };
    });
    container.compile();

    assert.strictEqual(container.hasDefinition('cp_service'), true, 'Container contains a service registered by a CompilerPass.');
    assert.strictEqual(container.getDefinition('s1').hasMethodCall('m1'), true, 'CompilerPass added a MethodCall to service "s1".');
    assert.strictEqual(container.getDefinition('s2').hasMethodCall('m1'), true, 'CompilerPass added a MethodCall to service "s2".');
    assert.strictEqual(container.getDefinition('s3').isPublic(), false, 'CompilerPass marked service "s3" as private.');
    assert.strictEqual(container.getDefinition('s4').isPublic(), false, 'CompilerPass marked service "s4" as private.');

    container.get('s1');

    assert.throws(function() { container.compile(); }, new Error("Unable to compile a container which is already compiled."), "Exception thrown when recompiling a container.");
    assert.throws(function() { container.register('f1', function(){}); }, new Error("Unable to register a new Definition on a frozen container."), "Exception thrown when registering a service on a frozen container.");
    assert.throws(function() { container.getDefinition('s1').addArgument(1); }, new Error("Unable to update a definition that is already initialized."), "Exception thrown when altering a definition that already has an instance.");

});
