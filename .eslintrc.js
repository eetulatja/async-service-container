module.exports = {
    extends: 'exove-nodejs',
    parserOptions: {
        ecmaVersion: 2018,
    },
    env: {
        mocha: true,
    },

    rules: {
        'indent': [ 'error', 4 ],
        'no-spaced-func': [ 'off' ],
        'func-call-spacing': [ 'error', 'never' ],
    },
};
