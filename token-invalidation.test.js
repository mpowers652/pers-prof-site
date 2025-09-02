const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

describe('Token Invalidation on Login Page', () => {
    test('should clear cookies when accessing login page', async () => {
        const response = await request(app)
            .get('/login')
            .set('Cookie', ['token=some-token', 'connect.sid=some-session']);

        expect(response.status).toBe(200);
        
        // Check that cookies are cleared
        const setCookieHeaders = response.headers['set-cookie'] || [];
        console.log('Login Set-Cookie headers:', setCookieHeaders);
        
        const tokenCleared = setCookieHeaders.some(cookie => 
            cookie.includes('token=;') || (cookie.includes('token=') && cookie.includes('expires=Thu, 01 Jan 1970'))
        );
        const sessionCleared = setCookieHeaders.some(cookie => 
            cookie.includes('connect.sid=;') || (cookie.includes('connect.sid=') && cookie.includes('expires=Thu, 01 Jan 1970'))
        );
        
        expect(tokenCleared).toBe(true);
        expect(sessionCleared).toBe(true);
        
        // Check cache control headers
        expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
        expect(response.headers['pragma']).toBe('no-cache');
        expect(response.headers['expires']).toBe('0');
        
        console.log('✓ Login page clears cookies and sets no-cache headers');
    });

    test('should clear cookies when accessing logout route', async () => {
        const response = await request(app)
            .get('/logout')
            .set('Cookie', ['token=some-token', 'connect.sid=some-session']);

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/login');
        
        // Check that cookies are cleared
        const setCookieHeaders = response.headers['set-cookie'] || [];
        console.log('Logout Set-Cookie headers:', setCookieHeaders);
        
        const tokenCleared = setCookieHeaders.some(cookie => 
            cookie.includes('token=;') || (cookie.includes('token=') && cookie.includes('expires=Thu, 01 Jan 1970'))
        );
        const sessionCleared = setCookieHeaders.some(cookie => 
            cookie.includes('connect.sid=;') || (cookie.includes('connect.sid=') && cookie.includes('expires=Thu, 01 Jan 1970'))
        );
        
        expect(tokenCleared).toBe(true);
        expect(sessionCleared).toBe(true);
        
        console.log('✓ Logout route clears cookies and redirects to login');
    });

    test('should handle POST logout request', async () => {
        const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
        
        const response = await request(app)
            .post('/auth/logout')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('Cookie', ['token=some-token']);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Logged out successfully');
        
        // Check that cookies are cleared
        const setCookieHeaders = response.headers['set-cookie'] || [];
        console.log('POST logout Set-Cookie headers:', setCookieHeaders);
        
        const tokenCleared = setCookieHeaders.some(cookie => 
            cookie.includes('token=;') || (cookie.includes('token=') && cookie.includes('expires=Thu, 01 Jan 1970'))
        );
        
        expect(tokenCleared).toBe(true);
        
        console.log('✓ POST logout clears cookies and returns success');
    });
});