const _ = require('lodash');
const Promise = require('bluebird');


class Injector {

    constructor(serviceContainer, object) {
        this.children = [];
        this.dependencies = [];
        this.references = [];
        this.object = object;

        this.public = new InjectorPublic(serviceContainer, this);
    }


    async deinit() {
        this.deinitialization = (async () => {
            await Promise.resolve();

            const referencesDeinitializedPromises = [];
            for (const reference of this.references) {
                referencesDeinitializedPromises.push(reference.deinitialization);
            }

            await Promise.all(referencesDeinitializedPromises);

            if (_.isFunction(this.object.deinit)) {
                await this.object.deinit();
            }
        })();

        await this.deinitialization;
    }

}

class InjectorPublic {

    constructor(serviceContainer, injector) {
        this.serviceContainer = serviceContainer;
        this.injector = injector;
    }


    async get(name) {
        // TODO Prevent duplicate dependencies if multiple
        //      `get(..)` calls are made.
        const service = await this.serviceContainer.get(name);

        this.injector.dependencies.push(name);

        const serviceInjector = _.find(this.serviceContainer.rootInjector.children, (child) => {
            return child.object === service;
        });

        serviceInjector.references.push(this.injector);

        return service;
    }

    release(name) {
        _.pull(this.injector.dependencies, name);
    }

    inject(object) {
        const childInjector = new Injector(this.serviceContainer, object);
        this.injector.children.push(childInjector);

        object[this.serviceContainer.property] = childInjector.public;

        return object;
    }

}

module.exports = Injector;
