module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        '*.js',
        '!jest.config.js',
        '!coverage/**'
    ],
    transformIgnorePatterns: [
        'node_modules/(?!@xenova/transformers)'
    ]
};