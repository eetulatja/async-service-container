import expect from 'expect.js';
import Promise from 'bluebird';

import ServiceContainer from '../src';


async function catchErrorAsync(fn) {
    try {
        await fn();
    }
    catch (error) {
        return error;
    }
}


describe('#set', () => {

    it('Should set a service correctly', () => {
        let serviceContainer = new ServiceContainer();

        let servicePromise = Promise.resolve();
        serviceContainer.set('testService', servicePromise);

        expect(serviceContainer.services.get('testService')).to.be(servicePromise);
    });

    it('Should throw on a non-thenable service', async () => {
        let serviceContainer = new ServiceContainer();

        expect(() => {
            serviceContainer.set('testService', {});
        }).to.throwError(/^`servicePromise` is not a thenable\.$/);
    });

    it('Should throw on an invalid service name', () => {
        let serviceContainer = new ServiceContainer();

        expect(() => {
            serviceContainer.set('', Promise.resolve());
        }).to.throwError(/^`name` must be a non-empty string\.$/);

        expect(() => {
            serviceContainer.set(1, Promise.resolve());
        }).to.throwError(/^`name` must be a non-empty string\.$/);
    });

});

describe('#get', () => {

    it('Should get a service correctly', () => {
        let serviceContainer = new ServiceContainer();

        let servicePromise = Promise.resolve();
        serviceContainer.set('testService', servicePromise);

        expect(serviceContainer.get('testService')).to.be(servicePromise);
    });

    it('Should throw for a non-existing service', async () => {
        let serviceContainer = new ServiceContainer();

        let error = await catchErrorAsync(async () => {
            await serviceContainer.get('testService');
        });
        expect(error.message).to.be('No service registered with name \'testService\'.');
    });

    it('Should throw on an invalid service name', async () => {
        let serviceContainer = new ServiceContainer();

        let error = await catchErrorAsync(async () => {
            await serviceContainer.get('');
        });
        expect(error.message).to.be('`name` must be a non-empty string.');

        error = await catchErrorAsync(async () => {
            await serviceContainer.get(1);
        });
        expect(error.message).to.be('`name` must be a non-empty string.');
    });

});

describe('#register', () => {

    it('Should register a service without an `init(..)` method', async () => {
        let serviceContainer = new ServiceContainer();

        let emptyService = {};

        serviceContainer.register([{
            name: 'emptyService',
            service: emptyService,
        }]);

        let registeredService = await serviceContainer.get('emptyService');
        expect(registeredService).to.be(emptyService);
    });

    it('Should register a service with an `init(..)` method', async () => {
        let serviceContainer = new ServiceContainer();

        let initWasCalled = false;

        let dummyService = {
            async init() {
                initWasCalled = true;
            },
        };

        serviceContainer.register([{
            name: 'dummyService',
            service: dummyService,
        }]);

        let registeredService = await serviceContainer.get('dummyService');
        expect(registeredService).to.be(dummyService);
        expect(initWasCalled).to.be(true);
    });

    it('Should throw for duplicate services with same name', async () => {
        let serviceContainer = new ServiceContainer();

        expect(() => {
            serviceContainer.register([
                {
                    name: 'testService',
                    service: {},
                },
                {
                    name: 'testService',
                    service: {},
                },
            ]);
        }).to.throwError(/^Duplicate service with name 'testService'\.$/);
    });

});

describe('#getDependencies', () => {

    it('Should get the dependency array for a service', async () => {
        let serviceContainer = new ServiceContainer();

        let emptyService = {};

        let accessedService;
        let dummyService = {
            async init() {
                accessedService = await this.services.get('emptyService');
            },
        };

        serviceContainer.register([
            {
                name: 'dummyService',
                service: dummyService,
            },
            {
                name: 'emptyService',
                service: emptyService,
            },
        ]);

        await serviceContainer.get('dummyService');

        let dummyServiceDependencies = await serviceContainer.getDependencies('dummyService');

        expect(accessedService).to.be(emptyService);
        expect(dummyServiceDependencies).to.eql([ 'emptyService' ]);
    });

    it('Should throw on an invalid service name', async () => {
        let serviceContainer = new ServiceContainer();

        serviceContainer.register([
            {
                name: 'testService',
                service: {},
            },
        ]);

        let error = await catchErrorAsync(async () => {
            await serviceContainer.getDependencies('invalidService');
        });
        expect(error.message).to.be('No service registered with name \'invalidService\'.');
    });

});

describe('#createInjector', () => {

    it('Should be able to set the property for the injector', async () => {
        let property = Symbol('Services');
        let serviceContainer = new ServiceContainer({ property: property });

        let emptyService = {};

        let accessedService;
        let dummyService = {
            async init() {
                accessedService = await this[property].get('emptyService');
            },
        };

        serviceContainer.register([
            {
                name: 'dummyService',
                service: dummyService,
            },
            {
                name: 'emptyService',
                service: emptyService,
            },
        ]);

        await serviceContainer.get('dummyService');

        let dummyServiceDependencies = await serviceContainer.getDependencies('dummyService');

        expect(accessedService).to.be(emptyService);
    });

});
