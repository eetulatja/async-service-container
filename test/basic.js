import expect from 'expect.js';
import Promise from 'bluebird';

import ServiceContainer from '../src/index';


describe('#set', () => {

    it('Should set a promise correctly', () => {
        let serviceContainer = new ServiceContainer();

        let service = Promise.resolve();
        serviceContainer.set('testService', service);

        expect(serviceContainer.services.get('testService').promise).to.be(service);
    });

    it('Should throw on a non-thenable', () => {
        let serviceContainer = new ServiceContainer();

        expect(() => {
            serviceContainer.set('testService', {});
        }).to.throwError(/^`promise` is not a thenable\.$/);
    });

    it('Should throw on an invalid name', () => {
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

    it('Should get a promise correctly', () => {
        let serviceContainer = new ServiceContainer();

        let service = Promise.resolve();
        serviceContainer.set('testService', service);

        expect(serviceContainer.get('testService')).to.be(service);
    });

    it('Should return undefined for non-existing promise', () => {
        let serviceContainer = new ServiceContainer();

        expect(serviceContainer.get('testService')).to.be(undefined);
    });

    it('Should throw on an invalid name', () => {
        let serviceContainer = new ServiceContainer();

        expect(() => {
            serviceContainer.get('');
        }).to.throwError(/^`name` must be a non-empty string\.$/);

        expect(() => {
            serviceContainer.get(1);
        }).to.throwError(/^`name` must be a non-empty string\.$/);
    });

});

describe('#register', () => {

    it('Should register a service without `init(..)` method', async () => {
        let serviceContainer = new ServiceContainer();

        let emptyService = {};

        serviceContainer.register([{
            name: 'emptyService',
            service: emptyService,
        }]);

        let registeredService = await serviceContainer.get('emptyService');
        expect(registeredService).to.be(emptyService);
    });

    it('Should register a service with `init(..)` method', async () => {
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

    it('Should set dependecies when accessing another service', async () => {
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

});
