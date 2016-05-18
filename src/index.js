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
        let allServicePromises = [];

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
                // into `services` so that all dependencies are
                // set before any `init(..)` calls.
                servicePromise = Promise.resolve().then(() => {
                    return service.init(options);
                }).then(() => service);
            }
            else {
                servicePromise = Promise.resolve(service);
            }

            allServicePromises.push(servicePromise);

            this.set(name, servicePromise);
        }

        return Promise.all(allServicePromises);
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
            component: object,
            public: {
                get: (name) => {
                    let dependency = this.get(name);

                    injector.dependencies.push(name);

                    return dependency;
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
