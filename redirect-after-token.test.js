const request = require('supertest');
const app = require('./server');

describe('OAuth Token Cookie Functionality', () => {
    test('should redirect to login when Google OAuth callback accessed without authentication', async () => {
        const response = await request(app)
            .get('/auth/google/callback')
            .expect(302);
        
        expect(response.headers.location).toBe('/login');
    });

    test('should redirect to login when Facebook OAuth callback accessed without authentication', async () => {
        const response = await request(app)
            .get('/auth/facebook/callback')
            .expect(302);
        
        expect(response.headers.location).toBe('/login');
    });

    test('should not expose token in URL parameters', async () => {
        const response = await request(app)
            .get('/')
            .set('X-User-Type', 'guest')
            .expect(200);
        
        // Should not contain token injection scripts
        expect(response.text).not.toContain('localStorage.setItem(\'token\'');
        expect(response.text).not.toContain('var token =');
    });

    test('should handle login success without token in URL', async () => {
        const response = await request(app)
            .get('/login?success=true')
            .expect(200);
        
        // Should not contain token-related scripts
        expect(response.text).not.toContain('window.location.search.includes(\'token=\')');
    });
});