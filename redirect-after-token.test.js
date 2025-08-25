const request = require('supertest');
const app = require('./server');

describe('Token Redirect Functionality', () => {
    test('should inject redirect script when token is present in URL', async () => {
        const testToken = 'test.token.123';
        
        const response = await request(app)
            .get(`/?token=${testToken}`)
            .expect(200);
        
        // Check that the response contains the redirect script
        expect(response.text).toContain('window.location.href = \'/\'');
        expect(response.text).toContain('Token saved to localStorage, redirecting...');
        expect(response.text).toContain('localStorage.setItem(\'token\', token)');
        expect(response.text).toContain(`var token = '${testToken}'`);
    });

    test('should handle token escaping in redirect script', async () => {
        const testToken = "test'token\"with'quotes";
        
        const response = await request(app)
            .get(`/?token=${encodeURIComponent(testToken)}`)
            .expect(200);
        
        // Check that quotes are properly escaped
        expect(response.text).toContain("test\\'token\\\"with\\'quotes");
        expect(response.text).toContain('window.location.href = \'/\'');
    });

    test('should not inject redirect script for users without token', async () => {
        const response = await request(app)
            .get('/')
            .expect(200);
        
        // Should not contain redirect script
        expect(response.text).not.toContain('window.location.href = \'/\'');
        expect(response.text).not.toContain('Token saved to localStorage');
    });

    test('should include URL check in redirect script', async () => {
        const testToken = 'retry.test.token';
        
        const response = await request(app)
            .get(`/?token=${testToken}`)
            .expect(200);
        
        // Check URL check is present
        expect(response.text).toContain('window.location.search.includes(\'token=\')');
        expect(response.text).toContain('setTimeout(function()');
    });
});