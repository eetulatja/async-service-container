# async-service-container

[![Build Status](https://travis-ci.org/eetulatja/async-service-container.svg?branch=master)](https://travis-ci.org/eetulatja/async-service-container)
[![npm](https://img.shields.io/npm/v/async-service-container.svg)](https://www.npmjs.com/package/async-service-container)

Promise based service container for dependency injection.

## Installation

	npm install async-service-container

#### Requirements

* Node.js **v7.6.0** or higher

## High level API

### `new ServiceContainer({ property })`

Create a new service container.

* `property` The name of the injector property. Default: `'services'`

### `register(services)`

* `services` Array of services to register. Each array element has the following properties:
	* `name` The name to register the service with.
	* `service` The actual service object.
	* `options` Optional. Options given to the service's `init(..)` method.

Returns a promise which gets resolved when all the services have been initialized. A rejected promise is returned if any service initialization returns a rejected promise.

## Injector API

### `get(name)`

Get a service with the given name.

### `release(name)`

Releases the services from this service's dependencies.

### `inject(object)`

Injects the services into the given object.

## Low level API

### `get(name)`

Get a promise from the container with the given name.

Rejected promise returned for an invalid name.

### `set(name, servicePromise)`

Set a promise into the container with the given name.

Throws for an invalid name and promise.

### `getDependencies(name)`

Returns dependencies for service registered as `name` in an array.

### `createInjector(object)`

Creates an injector into the given object.

Returns the created injector.
