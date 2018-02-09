module.exports = {
    extends: 'exove-nodejs',
    parserOptions: {
        ecmaVersion: 2018,
    },

    rules: {
        'indent': [ 'error', 4 ],
        'no-spaced-func': [ 'off' ],
        'func-call-spacing': [ 'error', 'never' ],
    },
};
