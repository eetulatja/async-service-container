const assert = require('assert');

const _ = require('lodash');


/**
 * Asserts that the given value is a non-empty string.
 *
 * @param {string} value
 * @param {string} variableName - Name of the variable included in
 *        the error message.
 *
 * @throws {AssertionError}
 */
function assertNonEmptyString(value, variableName) {
    // TODO Unit test
    assert(
        _.isString(value) && value.length > 0,
        `\`${variableName}\` must be a non-empty string.`,
    );
}

/**
 * Asserts that the given value is a thenable.
 *
 * @param {Promise} value
 * @param {string} variableName - Name of the variable included in
 *        the error message.
 *
 * @throws {AssertionError}
 */
function assertThenable(value, variableName) {
    // TODO Unit test
    assert(
        _.isFunction(value.then),
        `\`${variableName}\` is not a thenable.`,
    );
}

/**
 * If `func` is a function, it is bound to the given context.
 * Otherwise, a NOOP (a function that does nothing) is returned.
 *
 * @param {function} [func=undefined]
 * @param {*} [context=undefined]
 *
 * @return {function}
 */
function bindOrNoop(func, context) {
    // TODO Unit test
    const bound = _.isFunction(func) ? func.bind(context) : async () => {};

    return bound;
}


module.exports = {
    assertNonEmptyString,
    assertThenable,
    bindOrNoop,
};
