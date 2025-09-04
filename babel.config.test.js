describe('Babel Config', () => {
    test('exports valid configuration', () => {
        const config = require('./babel.config.js');
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
    });
});