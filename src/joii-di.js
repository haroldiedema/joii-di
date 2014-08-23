/*
  JOII Depedency Injection Library               _     _ _         .___.__
  https://github.com/haroldiedema/joii          (_)___(_|_)___   __| _/|__|
                                                | / _ \ | |___| / __ | |  |
  Copyright 2014, Harold Iedema                _/ \___/_|_|    / /_/ | |  |
 -------------------------------------------- |__/ ----------- \____ | |__| ---
 This program is free software: you can redistribute it and/or     \/
 modify it under the terms of the GNU General Public License as published by the
 Free Software Foundation, either version 3 of the License, or (at your option)
 any later version.

 This program is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
 PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 this program.  If not, see <http://www.gnu.org/licenses/>.
 ------------------------------------------------------------------------------
*/
if (typeof(_g) === 'undefined' || typeof(_g.$JOII) === 'undefined') {
    throw new Error('JOII-PlantUML requires JOII to be loaded.');
}

if (typeof(_g.$JOII.REVISION) === 'undefined' || _g.$JOII.REVISION < 22) {
    throw new Error('JOII-PlantUML requires JOII 2.2 or higher.');
}

(function(declare, Class, g) {

    declare('DependencyInjection', {

        /**
         * Represents a collection of service definitions.
         */
        Container : Class({

            definitions  : {},
            parameters   : {},
            loading      : {},
            passes       : [],
            is_frozen    : false,
            is_compiling : false,
            api          : null,

            __construct: function() {

                // Public API
                this.api = {
                    register             : this.register.bind(this),
                    get                  : this.get.bind(this),

                    // Definitions
                    hasDefinition        : this.hasDefinition.bind(this),
                    getDefinition        : this.getDefinition.bind(this),
                    addDefinitions       : this.addDefinitions.bind(this),
                    setDefinitions       : this.setDefinitions.bind(this),
                    setDefinition        : this.setDefinition.bind(this),
                    findTaggedServiceIds : this.findTaggedServiceIds.bind(this),

                    // Parameters
                    setParameters        : this.setParameters.bind(this),
                    hasParameter         : this.hasParameter.bind(this),
                    setParameter         : this.setParameter.bind(this),
                    getParameter         : this.getParameter.bind(this),

                    // CompilerPass
                    addCompilerPass      : this.addCompilerPass.bind(this),
                    compile              : this.compile.bind(this),
                    isFrozen             : this.isFrozen.bind(this)
                };

                return this.api;
            },

            /**
             * Creates a new Definition based on the passed name and function
             * and returns it.
             *
             * @param string name
             * @param mixed fn Function or string referencing the function.
             */
            register: function(name, fn)
            {
                if (this.is_frozen) {
                    throw new Error('Unable to register a new Definition on a frozen container.');
                }
                this.definitions[name] = new g.DependencyInjection.Definition(
                        fn
                );
                return this.definitions[name];
            },

            /**
             * Adds a CompilerPass to this container.
             *
             * A compiler pass must have a compile() method which accepts the
             * Container as its one and only argument. The CompilerPass may
             * add, alter or remove service definitions as it sees fit.
             *
             * @param CompilerPass compiler_pass
             */
            addCompilerPass: function(compiler_pass)
            {
                if (typeof(compiler_pass) === 'function') {
                    compiler_pass = new compiler_pass();
                }
                if (typeof(compiler_pass.compile) !== 'function') {
                    throw new Error('The CompilerPass doesn\'t have a compile function.');
                }
                this.passes.push(compiler_pass);
            },

            /**
             * Runs all compiler passes. After this process is complete, the
             * container is marked as frozen and no more definitions may be
             * added.
             */
            compile: function()
            {
                if (this.is_compiling) {
                    throw new Error('The container is already compiling.');
                }
                this.is_compiling = true;
                if (this.is_frozen) {
                    throw new Error('Unable to compile a container which is already compiled.');
                }
                for (var i in this.passes) {
                    this.passes[i].compile(this.api);
                }
                this.is_compiling = false;
                this.is_frozen = true;
            },

            /**
             * Returns true if this container is already compiled.
             *
             * @return bool
             */
            isFrozen: function()
            {
                return this.is_frozen;
            },

            /**
             * Returns the service with the associated id.
             *
             * @param string id
             * @return Object
             */
            get: function(id)
            {
                // Compile the container first if it hasn't been compiled yet.
                if (!this.is_frozen) {
                    this.compile();
                }

                if (typeof(this.definitions[id]) === 'undefined') {
                    throw new Error('Service ' + id + ' does not exist.');
                }
                var definition = this.definitions[id];

                // Do we already have an instance of this definition?
                if (definition.hasInstance()) {
                    return definition.getInstance();
                }

                // Circular reference check
                if (this.loading[id] === true) {
                    throw new Error('Service ' + id + ' has a circular reference to itself.');
                }
                this.loading[id] = true;

                // Create the service
                var service = this.createService(definition);

                // Remove the circular reference check
                delete this.loading[id];
                return service;
            },

            /**
             * Initializes the service definition and returns its function
             * instance.
             *
             * @access private
             * @return Object
             */
            createService: function(definition)
            {
                if (definition.hasInstance()) {
                    throw new Error('Attempt to create a service that already has an instance.');
                }

                // Build up an array of arguments to pass to the constructor.
                var c_args = this.getParameterArray(definition.getArguments());

                // Construct function to use '.apply' on 'new' objects.
                var construct = function(c, args) {
                    var cc = function() { return c.apply(this, args); };
                    cc.prototype = c.prototype; return new cc();
                };

                var fn       = definition.getFunction(),
                    instance = construct(fn, c_args);

                definition.setInstance(instance);

                var calls = definition.getMethodCalls();
                for (var i in calls) {
                    if (!calls.hasOwnProperty(i)) {
                        continue;
                    }
                    var method = calls[i][0];
                    var args   = this.getParameterArray(calls[i][1] || []);
                    instance[method].apply(instance, args);
                }
                return instance;
            },

            /**
             * Sets the service definitions.
             *
             * @param DependencyInjection.Definition[] An array of Definitions.
             * @return DependencyInjection.Container
             */
            setDefinitions: function(definitions)
            {
                if (this.is_frozen) {
                    throw new Error('Unable to register a new Definition on a frozen container.');
                }
                this.definitions = {};
                this.addDefinitions(definitions);
                return this.api;
            },

            /**
             * Adds the service definitions.
             *
             * @param Definition[] definitions An array of service definitions.
             * @return DependencyInjection.Container
             */
            addDefinitions: function(definitions)
            {
                for (var i in definitions) {
                    if (definitions.hasOwnProperty(i)) {
                        var def = definitions[i];
                        this.setDefinition(i, def);
                    }
                }
                return this.api;
            },

            /**
             * Sets a service definition.
             *
             * @param string id The id of the service
             * @param DepedencyInjection.Definition definition
             * @return DepedencyInjection.Container
             */
            setDefinition: function(id, definition)
            {
                if (this.is_frozen) {
                    throw new Error('Unable to register a new Definition on a frozen container.');
                }
                this.definitions[id] = definition;
                return this.api;
            },

            /**
             * Returns true if a service definition exists under the
             * given identifier.
             *
             * @return bool
             */
            hasDefinition: function(id)
            {
                return typeof(this.definitions[id]) !== 'undefined';
            },

            /**
             * Gets a service definition.
             *
             * @param string id The service identifier
             * @return DependencyInjection.Definition
             */
            getDefinition: function(id)
            {
                if (typeof(this.definitions[id]) === 'undefined') {
                    throw new Error('The service definition ' + id + ' does not exist.');
                }
                return this.definitions[id];
            },

            /**
             * Returns an array of tag attributes indexed by service id.
             *
             * @param string name
             * @return array
             */
            findTaggedServiceIds: function(name)
            {
                var result = {};
                for (var i in this.definitions) {
                    if (!this.definitions.hasOwnProperty(i)) {
                        continue;
                    }
                    if (this.definitions[i].hasTag(name)) {
                        result[i] = this.definitions[i].getTag(name);
                    }
                }
                return result;
            },

            /**
             * Sets the parameters array.
             *
             * @param  Object parameters
             * @return DepedencyInjection.Container
             */
            setParameters: function(parameters)
            {
                if (this.is_frozen) {
                    throw new Error('Unable to update parameters on a frozen container.');
                }
                this.parameters = parameters;
                return this.api;
            },

            /**
             * Sets a parameter.
             *
             * @param string name
             * @param mixed value
             * @return DepedencyInjection.Container
             */
            setParameter: function(name, value)
            {
                if (this.is_frozen) {
                    throw new Error('Unable to update parameters on a frozen container.');
                }
                this.parameters[name] = value;
                return this.api;
            },

            /**
             * Returns true if a parameter with the given name exists.
             *
             * @param string name
             * @return bool
             */
            hasParameter: function(name)
            {
                return typeof(this.parameters[name]) !== 'undefined';
            },

            /**
             * Returns the value of the parameter with the given name.
             *
             * @param string name
             * @return mixed
             */
            getParameter: function(name)
            {
                if (typeof(this.parameters[name]) !== 'undefined') {
                    return this.parameters[name];
                }
                throw new Error('Parameter ' + name + ' does not exist.');
            },

            /**
             * Returns a parsed parameter array.
             *
             * @access private
             * @param array arr
             * @return arr
             */
            getParameterArray: function(arr)
            {
                var args = [];
                for (var i in arr) {
                    var arg = arr[i];
                    if (typeof(arg) === 'string') {
                        arg = this.resolveParameter(arg);
                    }
                    args.push(arg);
                }
                return args;
            },

            /**
             * Resolves a parameter.
             *
             * If the value starts with an @, a service is referenced.
             * If the value is omitted with %, a parameter is referenced.
             *
             * @access private
             * @param string value
             * @return mixed
             */
            resolveParameter: function(value)
            {
                if (typeof(value) !== 'string') {
                    return value;
                }

                if (value.charAt(0) === '@') {
                    return this.get(value.slice(1, value.length));
                }

                if (value.charAt(0) === '%' && value.charAt(value.length - 1) === '%') {
                    return this.getParameter(value.slice(1, value.length - 1));
                }

                return value;
            }
        }),

        /**
         * Represents a definition of a service.
         */
        Definition : Class({

            name      : null,
            fn        : null,
            instance  : null,
            api       : null,
            is_public : true,
            arguments : [],
            calls     : [],
            tags      : {},

            /**
             * @param string name The name of this definition.
             * @param mixed  fn   Function or string referencing the function.
             */
            __construct: function(fn)
            {
                if (typeof(fn) !== 'function') {
                    this.fn = this.findFunctionFromString(fn);
                } else {
                    this.fn = fn;
                }

                // Public API
                this.api = {
                    addArgument      : this.addArgument.bind(this),
                    getArguments     : this.getArguments.bind(this),
                    setArguments     : this.setArguments.bind(this),
                    addMethodCall    : this.addMethodCall.bind(this),
                    setMethodCalls   : this.setMethodCalls.bind(this),
                    getMethodCalls   : this.getMethodCalls.bind(this),
                    hasMethodCall    : this.hasMethodCall.bind(this),
                    removeMethodCall : this.removeMethodCall.bind(this),
                    setTags          : this.setTags.bind(this),
                    getTags          : this.getTags.bind(this),
                    addTag           : this.addTag.bind(this),
                    hasTag           : this.hasTag.bind(this),
                    getTag           : this.getTag.bind(this),
                    clearTag         : this.clearTag.bind(this),
                    clearTags        : this.clearTags.bind(this),
                    isPublic         : this.isPublic.bind(this),
                    setPublic        : this.setPublic.bind(this),
                    hasInstance      : this.hasInstance.bind(this),
                    getInstance      : this.getInstance.bind(this),
                    setInstance      : this.setInstance.bind(this),
                    getFunction      : this.getFunction.bind(this)
                };

                // return this.api;
            },

            /**
             * Adds an argument to pass to the service constructor.
             *
             * @param mixed value
             * @return DependencyInjection.Definition
             */
            addArgument: function(argument)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                this.arguments.push(argument);
                return this.api;
            },

            /**
             * Sets the arguments to pass to the service constructor.
             *
             * @param mixed value
             * @return DependencyInjection.Definition
             */
            setArguments: function(args)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                this.arguments = args;
                return this.api;
            },

            /**
             * Gets the arguments to pass to the service constructor.
             *
             * @return array
             */
            getArguments: function()
            {
                return this.arguments;
            },

            /**
             * Sets the methods to call after service initialization.
             *
             * @param array calls
             * @return DependencyInjection.Definition
             */
            setMethodCalls: function(calls)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                this.calls = [];
                for (var i in calls) {
                    if (calls.hasOwnProperty(i)) {
                        this.calls[i] = calls[i];
                    }
                }
                return this.api;
            },

            /**
             * Adds a method to call after service initialization.
             *
             * @param string method
             * @param array  args
             * @return DependencyInjection.Definition
             */
            addMethodCall: function(method, args)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                args = args || [];
                this.calls.push([method, args]);
                return this.api;
            },

            /**
             * Removes a method call from this definition by the given name.
             *
             * @param string method
             * @return DependencyInjection.Definition
             */
            removeMethodCall: function(method)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                for (var i in this.calls) {
                    if (this.calls[i][0] === method) {
                        delete this.calls[i];
                    }
                }

                return this.api;
            },

            /**
             * Check if the current definition has a given method to call after
             * service initialization.
             *
             * @return bool
             */
            hasMethodCall: function(method)
            {
                for (var i in this.calls) {
                    if (this.calls[i][0] === method) {
                        return true;
                    }
                }
                return false;
            },

            /**
             * Gets the methods to call after service initialization.
             *
             * @return array
             */
            getMethodCalls: function()
            {
                return this.calls;
            },

            /**
             * Sets tags for this definition.
             *
             * @param array tags
             * @return DependencyInjection.Definition
             */
            setTags: function(tags)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                this.tags = tags;
                return this.api;
            },

            /**
             * Returns all tags.
             *
             * @return array
             */
            getTags: function()
            {
                return this.tags;
            },

            /**
             * Gets a tag by name.
             *
             * @param string name The tag name
             * @return array An array of attributes
             */
            getTag: function(name)
            {
                return typeof(this.tags[name]) !== 'undefined'
                    ? this.tags[name] : [];
            },

            /**
             * Add a tag for this definition.
             *
             * @param string name
             * @param array attributes
             * @return DependencyInjection.Definition
             */
            addTag: function(name, attributes)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                if (typeof(this.tags[name]) === 'undefined') {
                    this.tags[name] = [];
                }
                this.tags[name].push(attributes);
                return this.api;
            },

            /**
             * Returns true if this definition has a tag with the given name.
             *
             * @return bool
             */
            hasTag: function(name)
            {
                return typeof(this.tags[name]) !== 'undefined';
            },

            /**
             * Clears tags with the given name.
             *
             * @return DependencyInjection.Definition
             */
            clearTag: function(name)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                if (typeof(this.tags[name]) !== 'undefined') {
                    delete this.tags[name];
                }
                return this.api;
            },

            /**
             * @return DependencyInjection.Definition
             */
            clearTags: function()
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                this.tags = {};
                return this.api;
            },

            /**
             * Sets the visibility of this service.
             *
             * @return DependencyInjection.Definition
             */
            setPublic: function(flag)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                this.is_public = flag;
                return this.api;
            },

            /**
             * Returns true if this definition is public.
             *
             * Being public means it's retrievable from the container. A private
             * service is only usable as a dependency on other services.
             *
             * @return bool
             */
            isPublic: function()
            {
                return this.is_public;
            },

            /**
             * Returns true if this definition has an instance of the function
             * associated with it.
             *
             * @return bool
             */
            hasInstance: function()
            {
                return !!this.instance;
            },

            /**
             * Returns the associated instance.
             *
             * @return Object
             */
            getInstance: function()
            {
                if (typeof(this.instance) !== 'undefined') {
                    return this.instance;
                }
                throw new Error('Definition is not initialized.');
            },

            /**
             * Sets the instance for this definition.
             *
             * @param object instance
             * @return DependencyInjection.Definition
             */
            setInstance: function(instance)
            {
                if (this.hasInstance()) {
                    throw new Error('Unable to update a definition that is already initialized.');
                }
                this.instance = instance;
                return this.api;
            },

            /**
             * Returns the function associated with this Definition.
             *
             * @return Function
             */
            getFunction: function()
            {
                return this.fn;
            },

            /**
             * Finds the given function by string reference.
             *
             * @access private
             * @return function
             */
            findFunctionFromString: function(str)
            {
                if (str.indexOf('.') === -1) {
                    // There are no namespace separators, just return it.
                    if (typeof(_g[str]) === 'function') {
                        return _g[str];
                    }
                    throw new Error(str + ' is undefined or not a function.');
                }
                var chunks  = str.split('.'),
                    result  = _g,
                    str_rep = '',
                    current;
                while ((current = chunks.shift())) {
                    str_rep += current;
                    if (typeof(result[current]) === 'undefined' || (
                        typeof(result[current]) !== 'object' &&
                        typeof(result[current]) !== 'function')) {
                        throw new Error(str_rep + ' is undefined or not iterable.');
                    }
                    result = result[current];
                    str_rep += '.';
                }
                return result;
            }
        })

    });

}(
    _g.$JOII.RegisterInNS,
    _g.$JOII.PublicAPI.Class,
    _g.$JOII.Namespace
));