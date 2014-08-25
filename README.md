DependencyInjection in JavaScript
=================================

The DependencyInjection package for [JOII](https://github.com/haroldiedema/joii) allows you to apply the IoC design pattern to your JavaScript projects. The package itself requires [JOII](https://github.com/haroldiedema/joii) to function, but it works flawlessly with native JavaScript functions. This means that you don't have to port your own project to [JOII](https://github.com/haroldiedema/joii)-classes in order for this to work.

The functionality in this library has a close resemblance to [Symonfy2's DependencyInjection](http://symfony.com/doc/current/components/dependency_injection/introduction.html) component and can roughly be used in the same way.

This library has three main components: `ContainerBuilder`, `Container` and `Definition`. These components are declared in the `DependencyInjection` namespace.

## Basic Usage ##

```javascript
// Create a Container instance
var container = new DependencyInjection.Container();

// Add a service and grab its definition.
var definition = container.register('my_service', SomeJavascriptFunction);

// Set constructor arguments
definition.setArguments(['first parameter', 2, 'third']);
definition.addArgument('And a fourth');

// Add method calls
definition.addMethodCall('someMethod', ['first parameter', 'second']);
// ...

// Set tags in case you want to find all services tagged with a certain tag.
definition.addTag('some-tag', ['optional arguments']);
```

The definition instantiates `SomeJavascriptFunction` as soon as its first called and does the following:

* __Arguments__: 'first parameter', 2, 'third' are passed to the constructor
* __Methods__: `someMethod` is executed with arguments: 'first parameter', 'second'

All this code might seem a lot of work if you have to do this for all your service definitions, but this is were the `ContainerBuilder` comes in. All code above does the exact same as the following:

```javascript
// Create a ContainerBuilder
var builder = new DependencyInjection.ContainerBuilder();

// Fill the container using configuration:
builder.loadConfiguration({
    services: {
        my_service: {
            'class'     : SomeJavascriptFunction,
            'arguments' : ['first parameter', 2, 'third', 'and a fourth'],
            'calls'     : [
                ['someMethod', ['first parameter', 'second']]
            ],
            'tags'      : {
                'some-tag' : ['optional arguments']
            }
        }
    }
});
```

A service can be grabbed from the container using the `get` method:

```javascript
var myService = container.get('my_service');
```
All services are __lazy loaded__, meaning they'll only be instantiated when they're needed.

## Passing dependencies ##

The whole purpose of DependencyInjection is to allow you passing of parameters and other services into another service. A Container holds a _Parameter collection_ which is simply a key-value storage which you can use to store whatever you want. 

### Parameters ###
Parameters can be passed to a service by omitting the parameter name with percent signs.

```javascript
// Create a parameter
container.setParameter('foobar', 'Hello World');

// Pass the parameter to the definition.
definition.addArgument('%foorbar%');
```

As soon as the service is instantiated, the library will replace '%foobar%' with 'Hello World' before passing it as a constructor argument. The same is possible with method arguments.

Parameters can also be set using the configuration object passed to the ContainerBuilder:
```javascript
builder.loadConfiguration({
    services: {
        service_a: {
            'class'     : SomeFunction,
            'arguments' : ['%foobar%']
        }
    },
    parameters: {
        foobar: 'Hello World'
    }
}
```
_note:_ `loadConfiguration` may be called multiple times.

### Services ###

A service can be referenced just like parameters, but instead of omitting the name with percent signs, the name needs to be prefixed with an at-sign `@`.

```javascript
// Register a service
container.register('some_service', 'Some.Namespace.Service');

// Pass a reference to the service as a constructor argument
definition.addArgument('@some_service');
```

As soon as the service in the definition is instantiated, the dependency `some_service` will be instantiated first. Beware that the library takes circular references into account and will throw an exception when this occurs. For example:

```javascript
builder.loadConfiguration({
    services: {
        service_a: {
            'class'     : SomeFunction,
            'arguments' : ['@service_b']
        },
        service_b: {
            'class'     : AnotherFunction,
            'arguments' : ['@service_a']
        }
    }
});

var my_service = builder.getContainer().get('service_a');
// Exception: Service service_a has a circular reference to itself.
```

## Service Class Declaration ##

As you might imagine, creating service definitions the way explained in the examples above, may cause one problem: You don't always have access to the scope of a function, or you want to load configuration from a JSON file. This means you can't simply pass the function itself to the `class` parameter.

But, where there is a problem, there is a solution. You can pass a string as a class (function) reference and the library will look in the global scope for that function.

Imagine we have a function which we want to register as a service in the following namespace: `MyApplication.Providers.AuthenticationProvider`, and we load our configuration from a closed scope, making it impossible to make a direct reference to that function.

Simply pass the name as a string.
```javascript
container.register('authentication_provider', 'MyApplication.Providers.AuthenticationProvider');
```
