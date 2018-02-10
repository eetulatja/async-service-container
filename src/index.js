const _ = require('lodash');
const Promise = require('bluebird');


function assertName(name) {
    if (!_.isString(name) || !name) {
        throw Error('`name` must be a non-empty string.');
    }
}

function assertPromise(promise) {
    if (!_.isFunction(promise.then)) {
        throw Error('`servicePromise` is not a thenable.');
    }
}


class ServiceContainer {

    constructor({ property = 'services' } = {}) {
        this.property = property;

        this.services = new Map();

        this.rootInjector = this.createInjector(this);
    }


    async get(name) {
        assertName(name);

        if (!this.services.has(name)) {
            throw new Error(`No service registered with name '${name}'.`);
        }

        // TODO Define behavior when an init promise gets rejected.
        const service = await this.services.get(name);

        return service;
    }

    set(name, servicePromise) {
        assertName(name);
        assertPromise(servicePromise);

        this.services.set(name, servicePromise);
    }

    async register(serviceDefinitions) {
        const servicePromises = serviceDefinitions.map(serviceDefinition => {
            const { service, name, options } = serviceDefinition;

            if (this.services.has(name)) {
                throw Error(`Duplicate service with name '${name}'.`);
            }

            // TODO Add explanation
            this.rootInjector.public.inject(service);

            const init = _.isFunction(service.init) ? service.init.bind(service) : async () => {};

            // Use an IIFE to create a promise that gets resolved with this service
            // after its `init` method is complete.
            const servicePromise = (async () => {
                // Awaiting on `Promise.resolve()` causes the `init` method
                // to be called on the next event loop tick.
                // This is done to defer the execution of `init` methods after
                // all services have been set into `this.services`.
                // Otherwise the services might not be able to access their
                // dependencies due to `get` returning undefined.
                await Promise.resolve();

                await init(options);

                return service;
            })();

            this.set(name, servicePromise);

            return servicePromise;
        });

        // TODO It doesn't really make sense to return an array of the services.
        //      This is here to make the current unit tests pass.
        //      Figure out a better way to test that this promise resolves after
        //      all init promises.
        const services = await Promise.all(servicePromises);

        return services;
    }

    deregister(name) {
        const deinitPromises = [];

        function deinitInjector(injector) {
            injector.deinit();

            deinitPromises.push(injector.deinitialization);

            for (const childInjector of injector.children) {
                deinitInjector(childInjector);
            }
        }

        if (name) {
            // TODO deregister a single service
        }
        else {
            // Deregister all services and any components depending on them.
            deinitInjector(this.rootInjector);
        }

        return Promise.all(deinitPromises);
    }

    getDependencies(name) {
        return this.get(name).then(service => {
            const serviceInjector = _.find(this.rootInjector.children, (child) => {
                return child.component === service;
            });

            return serviceInjector.dependencies;
        });
    }

    createInjector(object) {
        const injector = {
            children: [],
            dependencies: [],
            references: [],
            component: object,
            deinit: () => {
                injector.deinitialization = Promise.resolve().then(() => {

                    const referencesDeinitializedPromises = [];
                    for (const reference of injector.references) {
                        referencesDeinitializedPromises.push(reference.deinitialization);
                    }

                    return Promise.all(referencesDeinitializedPromises);

                }).then(() => {

                    if (_.isFunction(injector.component.deinit)) {
                        return injector.component.deinit();
                    }

                });
            },
            public: {
                get: (name) => {
                    // TODO Prevent duplicate dependencies if multiple
                    //      `get(..)` calls are made.
                    return this.get(name).then(service => {
                        const dependency = this.get(name);

                        injector.dependencies.push(name);

                        const serviceInjector = _.find(this.rootInjector.children, (child) => {
                            return child.component === service;
                        });

                        serviceInjector.references.push(injector);

                        return dependency;
                    });
                },
                release(name) {
                    _.pull(injector.dependencies, name);
                },
                inject: (object) => {
                    const childInjector = this.createInjector(object);
                    injector.children.push(childInjector);

                    object[this.property] = childInjector.public;

                    return object;
                },
            },
        };

        return injector;
    }

};

module.exports = {
    ServiceContainer,
};
