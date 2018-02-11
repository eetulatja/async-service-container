const { expect } = require('chai');

const { ServiceContainer, services: injector } = require('..');


describe('Injector', () => {

    describe('#inject', () => {

        // TODO This is more of a functional test, move to a better place
        it('Should be able to set the property for the injector', async () => {
            const serviceContainer = new ServiceContainer({ property: 'services' });

            const emptyService = {};

            let accessedService;
            const dummyService = {
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

            expect(accessedService).to.equal(emptyService);
        });

    });

    describe('#release', () => {

        it('Should remove a service from injector\'s dependencies', async () => {
            const serviceContainer = new ServiceContainer();

            const a = {
                async init() {
                    await this[injector].get('b');
                    await this[injector].get('c');
                },
            };
            const b = {};
            const c = {};

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

            const aDependencies = await serviceContainer.getDependencies('a');
            expect(aDependencies).to.eql([ 'b', 'c' ]);

            a[injector].release('b');
            expect(aDependencies).to.eql([ 'c' ]);
        });

    });

});
