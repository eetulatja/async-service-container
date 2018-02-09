const expect = require('expect.js');
const Promise = require('bluebird');
const _ = require('lodash');

const ServiceContainer = require('../src');


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

    it('Should return a promise which resolves when all services are ready', async () => {
        let serviceContainer = new ServiceContainer();

        let testService1 = {};
        let testService2 = {};

        let registeredServices = await serviceContainer.register([
            {
                name: 'testService1',
                service: testService1,
            },
            {
                name: 'testService2',
                service: testService2,
            },
        ]);

        expect(registeredServices).to.eql([ testService1, testService2 ]);
    });

    it('Should register services in correct order', async () => {
        let serviceContainer = new ServiceContainer();

        let numberOfServicesToCreate = 20;
        let services = [];
        let serviceNames = [];
        let actualInitializationOrder = [];

        function createDummyService(serviceIndex) {

            // Cast service index to string to be used as the service's name.
            let serviceName = String(serviceIndex);

            let dependsOn;
            if (serviceIndex < numberOfServicesToCreate - 1) {

                // The dummy service depends on the service whose index is one larger,
                // except for the service with the largest index, which is not
                // dependent on anything.
                dependsOn = String(serviceIndex + 1);
            }

            serviceNames.push(serviceName);

            let dummyService = {
                name: serviceName,
                service: {
                    async init() {
                        if (dependsOn) {
                            await this.services.get(dependsOn);
                        }

                        actualInitializationOrder.push(serviceName);
                    },
                },
            };

            return dummyService;
        }

        for (let i = 0; i < numberOfServicesToCreate; i++) {
            services.push(createDummyService(i));
        }


        let expectedInitializationOrder = _.reverse(serviceNames);

        // Shuffle the order of the service constructors in the array
        // to make the test even more reliable.
        await serviceContainer.register(_.shuffle(services));

        expect(actualInitializationOrder).to.eql(expectedInitializationOrder);
    });

    it('Should deregister services in correct order', async () => {
        let serviceContainer = new ServiceContainer();

        let numberOfServicesToCreate = 10;
        let services = [];
        let serviceNames = [];
        let actualDeinitializationOrder = [];

        function createDummyService(serviceIndex) {

            // Cast service index to string to be used as the service's name.
            let serviceName = String(serviceIndex);

            let dependsOn;
            if (serviceIndex < numberOfServicesToCreate - 1) {

                // The dummy service depends on the service whose index is one larger,
                // except for the service with the largest index, which is not
                // dependent on anything.
                dependsOn = String(serviceIndex + 1);
            }

            serviceNames.push(serviceName);

            let dummyService = {
                name: serviceName,
                service: {
                    async init() {
                        if (dependsOn) {
                            await this.services.get(dependsOn);
                        }
                    },
                    async deinit() {
                        actualDeinitializationOrder.push(serviceName);
                    },
                },
            };

            return dummyService;
        }

        for (let i = 0; i < numberOfServicesToCreate; i++) {
            services.push(createDummyService(i));
        }


        let expectedDeinitializationOrder = serviceNames;

        // Shuffle the order of the service constructors in the array
        // to make the test even more reliable.
        await serviceContainer.register(_.shuffle(services));

        await serviceContainer.deregister();

        expect(actualDeinitializationOrder).to.eql(expectedDeinitializationOrder);
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

        await serviceContainer.register([
            {
                name: 'dummyService',
                service: dummyService,
            },
            {
                name: 'emptyService',
                service: emptyService,
            },
        ]);

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

        await serviceContainer.register([
            {
                name: 'dummyService',
                service: dummyService,
            },
            {
                name: 'emptyService',
                service: emptyService,
            },
        ]);

        expect(accessedService).to.be(emptyService);
    });

});

describe('Injector', () => {

    describe('#release', () => {

        it ('Should remove a service from injector\'s dependencies', async () => {
            let serviceContainer = new ServiceContainer();

            let a = {
                async init() {
                    await this.services.get('b');
                    await this.services.get('c');
                },
            };
            let b = {};
            let c = {};

            serviceContainer.register([
                {
                    name: 'a',
                    service: a,
                },
                {
                    name: 'b',
                    service: b,
                },
                {
                    name: 'c',
                    service: c,
                },
            ]);

            let aDependencies = await serviceContainer.getDependencies('a');
            expect(aDependencies).to.eql([ 'b', 'c' ]);

            a.services.release('b');
            expect(aDependencies).to.eql([ 'c' ]);
        });

    });

});
