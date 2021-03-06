const _ = require('lodash');
const Promise = require('bluebird');

const { bindOrNoop } = require('./util');


class Injector {

    constructor(serviceContainer, object) {
        this.serviceContainer = serviceContainer;
        this.children = [];
        this.dependencies = [];
        this.references = [];
        this.object = object;
    }


    async deinit() {
        this.deinitialization = (async () => {
            await Promise.resolve();

            const referencesDeinitializedPromises = [];
            for (const reference of this.references) {
                referencesDeinitializedPromises.push(reference.deinitialization);
            }

            await Promise.all(referencesDeinitializedPromises);

            // Call the `deinit` method of the object if one exits.
            const deinit = bindOrNoop(this.object.deinit, this.object);
            await deinit();
        })();

        await this.deinitialization;
    }

    async get(name) {
        // TODO Prevent duplicate dependencies if multiple
        //      `get(..)` calls are made.
        const service = await this.serviceContainer.get(name);

        this.dependencies.push(name);

        const serviceInjector = this.serviceContainer.rootInjector.findChildInjector(service);

        serviceInjector.references.push(this);

        return service;
    }

    release(name) {
        _.pull(this.dependencies, name);
        
        // TODO Remove the link from the `references` list of service `name`.
    }

    inject(object, exposeContainer = true) {
        const childInjector = new Injector(this.serviceContainer, object);
        this.children.push(childInjector);

        if (exposeContainer) {
            Object.defineProperty(object, this.serviceContainer.property, {
                value: childInjector,
                enumerable: false,
            });
        }

        return object;
    }

    findChildInjector(object) {
        const injector = _.find(this.children, (child) => {
            return child.object === object;
        });

        return injector;
    }

}

module.exports = Injector;
