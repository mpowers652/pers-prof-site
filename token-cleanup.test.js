const { JSDOM } = require('jsdom');

describe('Token Cleanup', () => {
    let window, localStorage, document;

    beforeEach(() => {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html><body></body></html>
        `, { url: 'https://localhost:3000' });
        
        window = dom.window;
        localStorage = window.localStorage;
        document = window.document;
        
        global.window = window;
        global.localStorage = localStorage;
        global.document = document;
        global.atob = window.atob;
        global.Date = window.Date;
    });

    test('should detect expired token', () => {
        // Create expired token (exp: past timestamp)
        const expiredPayload = { id: 1, exp: Math.floor(Date.now() / 1000) - 3600 };
        const expiredToken = 'header.' + Buffer.from(JSON.stringify(expiredPayload)).toString('base64') + '.signature';
        
        localStorage.setItem('token', expiredToken);
        
        // Load auth.js functionality
        eval(require('fs').readFileSync('./auth.js', 'utf8'));
        
        // Token should be cleared
        expect(localStorage.getItem('token')).toBeNull();
    });

    test('should keep valid token', () => {
        // Create valid token (exp: future timestamp)
        const validPayload = { id: 1, exp: Math.floor(Date.now() / 1000) + 3600 };
        const validToken = 'header.' + Buffer.from(JSON.stringify(validPayload)).toString('base64') + '.signature';
        
        localStorage.setItem('token', validToken);
        
        // Load auth.js functionality
        eval(require('fs').readFileSync('./auth.js', 'utf8'));
        
        // Token should remain
        expect(localStorage.getItem('token')).toBe(validToken);
    });
});