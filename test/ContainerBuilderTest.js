test('JOII DI - ContainerBuilder', function(assert) {

    var builder = new DependencyInjection.ContainerBuilder();
    assert.deepEqual(builder.getContainer().getServiceIds(), [], 'Initial Container is empty.');

    assert.throws(function() { builder.loadConfiguration(''); }, new Error("loadConfiguration expectes an object, string given."), "Exception thrown when passing invalid configuration data");
    assert.throws(function() { builder.loadConfiguration({}); }, new Error("The configuration object must have a 'parameters' and/or 'services' element."), "Exception thrown when passing incomplete configuration data");

    builder.loadConfiguration({
        services: {
            test1: {
                'class'     : function(a,b){ this.foo = false; this.bar=false; this.a=a; this.b=b; this.foo = function(){ this.foo=true; }; this.bar=function(){ this.bar=true; }; },
                'arguments' : ['%param_1%', '%param_2%'],
                'calls'     : [
                     ['foo', [1, 2]],
                     ['bar', [1, 2]]
                ],
                'tags'      : {
                    tag1: [1, 2],
                    tag2: [1, 2]
                }
            }
        },
        parameters: {
            'param_1' : 'Hello World',
            'param_2' : 'Foobar'
        }
    });

    var container = builder.getContainer();
    assert.strictEqual(container.hasDefinition('test1'), true, 'Definition "test1", correctly registered via loadConfiguration');

    var def = container.getDefinition('test1');
    assert.deepEqual(def.getArguments(), ['%param_1%', '%param_2%'], "Arguments correctly parsed.");
    assert.deepEqual(def.getMethodCalls(), [["foo",[1,2]],["bar",[1,2]]], "MethodCalls correctly parsed.");
    assert.deepEqual(def.getTags(), {"tag1":[1,2],"tag2":[1,2]}, "Tags correctly parsed.");

    var i1 = container.get('test1');
    assert.strictEqual(i1.foo, true, 'Method foo executed correctly.');
    assert.strictEqual(i1.bar, true, 'Method bar executed correctly.');
    assert.strictEqual(i1.a, 'Hello World', 'Argument #1 passed from parameters correctly.');
    assert.strictEqual(i1.b, 'Foobar', 'Argument #2 passed from parameters correctly.');

    var t = container.findTaggedServiceIds('tag1');
    assert.deepEqual(t, {test1: [1,2]}, "Service tag 'tag1' applied correctly.");
    var t = container.findTaggedServiceIds('tag2');
    assert.deepEqual(t, {test1: [1,2]}, "Service tag 'tag2' applied correctly.");
});
