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


    get(name) {
        assertName(name);

        let servicePromise = this.services.get(name);

        if (!servicePromise) {
            throw Error(`No service registered with name '${name}'.`);
        }

        return servicePromise;
    }

    set(name, servicePromise) {
        assertName(name);
        assertPromise(servicePromise);

        this.services.set(name, servicePromise);
    }

    register(services) {
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
                servicePromise = (async () => {
                    // `Promise.delay(0)` causes the `service.init(..)`
                    // to be called on the next event loop tick.
                    // This is done because we want to map all the promises
                    // into `services` before any service initialization takes place
                    // so that dependencies can be properly found.
                    await Promise.delay(0);

                    await service.init(options);

                    return service;
                })();
            }
            else {
                servicePromise = Promise.resolve(service);
            }

            this.set(name, servicePromise);
        }
    }

    async getDependencies(name) {
        let service = await this.get(name);

        let serviceInjector = _.find(this.rootInjector.children, (child) => {
            return child.component === service;
        });

        return serviceInjector.dependencies;
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

                    object.services = childInjector.public;

                    return object;
                },
            },
        };

        return injector;
    }

}
