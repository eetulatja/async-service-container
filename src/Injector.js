const _ = require('lodash');
const Promise = require('bluebird');


module.exports = function createInjector(serviceContainer, object) {
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
                return serviceContainer.get(name).then(service => {
                    const dependency = serviceContainer.get(name);

                    injector.dependencies.push(name);

                    const serviceInjector = _.find(serviceContainer.rootInjector.children, (child) => {
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
                const childInjector = createInjector(serviceContainer, object);
                injector.children.push(childInjector);

                object[serviceContainer.property] = childInjector.public;

                return object;
            },
        },
    };

    return injector;
};
