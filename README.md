# async-service-container

Promise based service container for dependency injection.

## Low level API

### `get(name)`

Get a promise from the container with the given name.

Throws for an invalid name.

### `set(name, promise)`

Set a promise into the container with the given name.

Throws for an invalid name and promise.