module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        '*.js',
        '!jest.config.js',
        '!coverage/**'
    ],
    transformIgnorePatterns: [
        'node_modules/(?!@xenova/transformers)'
    ],
    setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
    forceExit: true,
    testTimeout: 15000
};