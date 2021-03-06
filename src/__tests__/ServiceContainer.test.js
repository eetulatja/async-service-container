const { expect } = require('chai');
const Promise = require('bluebird');
const _ = require('lodash');

const { ServiceContainer, services: injector } = require('..');


async function catchErrorAsync(fn) {
    // TODO Use chai-as-promise instead
    try {
        await fn();
    }
    catch (error) {
        return error;
    }
}


describe('ServiceContainer', () => {

    describe('#set', () => {

        it('Should set a service correctly', () => {
            const serviceContainer = new ServiceContainer();

            const servicePromise = Promise.resolve();
            serviceContainer.set('testService', servicePromise);

            expect(serviceContainer.services.get('testService')).to.equal(servicePromise);
        });

        it('Should throw on a non-thenable service', async () => {
            const serviceContainer = new ServiceContainer();

            expect(() => {
                serviceContainer.set('testService', {});
            }).to.throw('`servicePromise` is not a thenable.');
        });

        it('Should throw on an invalid service name', () => {
            const serviceContainer = new ServiceContainer();

            expect(() => {
                serviceContainer.set('', Promise.resolve());
            }).to.throw('`name` must be a non-empty string.');

            expect(() => {
                serviceContainer.set(1, Promise.resolve());
            }).to.throw('`name` must be a non-empty string.');
        });

    });

    describe('#get', () => {

        it('Should get a service correctly', async () => {
            const serviceContainer = new ServiceContainer();

            const service = {};
            const servicePromise = Promise.resolve(service);
            serviceContainer.set('testService', servicePromise);

            const returnedService = await serviceContainer.get('testService');
            expect(returnedService).to.equal(service);
        });

        it('Should throw for a non-existing service', async () => {
            const serviceContainer = new ServiceContainer();

            const error = await catchErrorAsync(async () => {
                await serviceContainer.get('testService');
            });
            expect(error.message).to.equal('No service registered with name \'testService\'.');
        });

        it('Should throw on an invalid service name', async () => {
            const serviceContainer = new ServiceContainer();

            let error = await catchErrorAsync(async () => {
                await serviceContainer.get('');
            });
            expect(error.message).to.equal('`name` must be a non-empty string.');

            error = await catchErrorAsync(async () => {
                await serviceContainer.get(1);
            });
            expect(error.message).to.equal('`name` must be a non-empty string.');
        });

    });

    describe('#register', () => {

        it('Should register a service without an `init(..)` method', async () => {
            const serviceContainer = new ServiceContainer();

            const emptyService = {};

            serviceContainer.register([
                {
                    name: 'emptyService',
                    service: emptyService,
                },
            ]);

            const registeredService = await serviceContainer.get('emptyService');
            expect(registeredService).to.equal(emptyService);
        });

        it('Should register a service with an `init(..)` method', async () => {
            const serviceContainer = new ServiceContainer();

            let initWasCalled = false;

            const dummyService = {
                async init() {
                    initWasCalled = true;
                },
            };

            serviceContainer.register([
                {
                    name: 'dummyService',
                    service: dummyService,
                },
            ]);

            const registeredService = await serviceContainer.get('dummyService');
            expect(registeredService).to.equal(dummyService);
            expect(initWasCalled).to.equal(true);
        });

        it('`init` is called with correct `this` context', async () => {
            const serviceContainer = new ServiceContainer();

            let calledWithContext;

            const dummyService = {
                async init() {
                    calledWithContext = this;
                },
            };

            serviceContainer.register([
                {
                    name: 'dummyService',
                    service: dummyService,
                },
            ]);

            const registeredService = await serviceContainer.get('dummyService');
            expect(registeredService).to.equal(dummyService);
            expect(calledWithContext).to.equal(dummyService);
        });

        it('Should throw for duplicate services with same name', async () => {
            const serviceContainer = new ServiceContainer();

            const error = await catchErrorAsync(async () => {
                await serviceContainer.register([
                    {
                        name: 'testService',
                        service: {},
                    },
                    {
                        name: 'testService',
                        service: {},
                    },
                ]);
            });
            expect(error.message).to.equal('Duplicate service with name \'testService\'.');
        });

        it('Should return a promise which resolves when all services are ready', async () => {
            const serviceContainer = new ServiceContainer();

            const testService1 = {};
            const testService2 = {};

            const registeredServices = await serviceContainer.register([
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
            const serviceContainer = new ServiceContainer();

            const numberOfServicesToCreate = 20;
            const services = [];
            const serviceNames = [];
            const actualInitializationOrder = [];

            function createDummyService(serviceIndex) {

                // Cast service index to string to be used as the service's name.
                const serviceName = String(serviceIndex);

                let dependsOn;
                if (serviceIndex < numberOfServicesToCreate - 1) {

                    // The dummy service depends on the service whose index is one larger,
                    // except for the service with the largest index, which is not
                    // dependent on anything.
                    dependsOn = String(serviceIndex + 1);
                }

                serviceNames.push(serviceName);

                const dummyService = {
                    name: serviceName,
                    service: {
                        async init() {
                            if (dependsOn) {
                                await this[injector].get(dependsOn);
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


            const expectedInitializationOrder = _.reverse(serviceNames);

            // Shuffle the order of the service constructors in the array
            // to make the test even more reliable.
            await serviceContainer.register(_.shuffle(services));

            expect(actualInitializationOrder).to.eql(expectedInitializationOrder);
        });

    });

    describe('#deregister', () => {

        it('Should deregister services in correct order', async () => {
            const serviceContainer = new ServiceContainer();

            const numberOfServicesToCreate = 10;
            const services = [];
            const serviceNames = [];
            const actualDeinitializationOrder = [];

            function createDummyService(serviceIndex) {

                // Cast service index to string to be used as the service's name.
                const serviceName = String(serviceIndex);

                let dependsOn;
                if (serviceIndex < numberOfServicesToCreate - 1) {

                    // The dummy service depends on the service whose index is one larger,
                    // except for the service with the largest index, which is not
                    // dependent on anything.
                    dependsOn = String(serviceIndex + 1);
                }

                serviceNames.push(serviceName);

                const dummyService = {
                    name: serviceName,
                    service: {
                        async init() {
                            if (dependsOn) {
                                await this[injector].get(dependsOn);
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


            const expectedDeinitializationOrder = serviceNames;

            // Shuffle the order of the service constructors in the array
            // to make the test even more reliable.
            await serviceContainer.register(_.shuffle(services));

            await serviceContainer.deregister();

            expect(actualDeinitializationOrder).to.eql(expectedDeinitializationOrder);
        });

    });

    describe('#getDependencies', () => {

        it('Should get the dependency array for a service', async () => {
            const serviceContainer = new ServiceContainer();

            const emptyService = {};

            let accessedService;
            const dummyService = {
                async init() {
                    accessedService = await this[injector].get('emptyService');
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

            const dummyServiceDependencies = await serviceContainer.getDependencies('dummyService');

            expect(accessedService).to.equal(emptyService);
            expect(dummyServiceDependencies).to.eql([ 'emptyService' ]);
        });

        it('Should throw on an invalid service name', async () => {
            const serviceContainer = new ServiceContainer();

            serviceContainer.register([
                {
                    name: 'testService',
                    service: {},
                },
            ]);

            const error = await catchErrorAsync(async () => {
                await serviceContainer.getDependencies('invalidService');
            });
            expect(error.message).to.equal('No service registered with name \'invalidService\'.');
        });

    });

});
