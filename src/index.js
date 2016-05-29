import _ from 'lodash';
import Promise from 'bluebird';


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


export default class ServiceContainer {

    services = new Map();

    rootInjector = this.createInjector(this);


    constructor({ property = 'services' } = {}) {
        this.property = property;
    }


    get(name) {
        try {
            assertName(name);
        }
        catch (error) {
            return Promise.reject(error);
        }

        let servicePromise = this.services.get(name);

        if (!servicePromise) {
            return Promise.reject(Error(`No service registered with name '${name}'.`));
        }

        return servicePromise;
    }

    set(name, servicePromise) {
        assertName(name);
        assertPromise(servicePromise);

        this.services.set(name, servicePromise);
    }

    register(services) {
        let initPromises = [];

        for (let serviceWrapper of services) {
            let service = serviceWrapper.service;
            let name = serviceWrapper.name;
            let options = serviceWrapper.options;

            if (this.services.has(name)) {
                throw Error(`Duplicate service with name '${name}'.`);
            }

            this.rootInjector.public.inject(service);

            let servicePromise;
            if (_.isFunction(service.init)) {
                // `Promise.resolve()` causes the `service.init(..)`
                // to be called on the next event loop tick.
                // This is done because we want to map all the promises
                // into `this.services` before any `init(..)` calls.
                servicePromise = Promise.resolve().then(() => {
                    return service.init(options);
                }).then(() => service);
            }
            else {
                servicePromise = Promise.resolve(service);
            }

            initPromises.push(servicePromise);

            this.set(name, servicePromise);
        }

        return Promise.all(initPromises);
    }

    deregister(name) {
        let deinitPromises = [];

        if (name) {
            // TODO deregister a single service
        }
        else {
            // Deregister all services and any components depending on them.
            function deinitInjector(injector) {
                injector.deinit();

                deinitPromises.push(injector.deinitialization);

                for (let childInjector of injector.children) {
                    deinitInjector(childInjector);
                }
            }

            deinitInjector(this.rootInjector);
        }

        return Promise.all(deinitPromises);
    }

    getDependencies(name) {
        return this.get(name).then(service => {
            let serviceInjector = _.find(this.rootInjector.children, (child) => {
                return child.component === service;
            });

            return serviceInjector.dependencies;
        });
    }

    createInjector(object) {
        let injector = {
            children: [],
            dependencies: [],
            references: [],
            component: object,
            deinit: () => {
                injector.deinitialization = Promise.resolve().then(() => {

                    let referencesDeinitializedPromises = [];
                    for (let reference of injector.references) {
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
                        let dependency = this.get(name);

                        injector.dependencies.push(name);

                        let serviceInjector = _.find(this.rootInjector.children, (child) => {
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
                    let childInjector = this.createInjector(object);
                    injector.children.push(childInjector);

                    object[this.property] = childInjector.public;

                    return object;
                },
            },
        };

        return injector;
    }

}
