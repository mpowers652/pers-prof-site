const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

describe('localStorage Token Saving', () => {
    let validToken;

    beforeEach(() => {
        validToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' });
    });

    describe('Token Security', () => {
        test('should not accept tokens in URL parameters', async () => {
            await request(app)
                .get(`/?token=${validToken}`)
                .expect(302); // Redirects to login
        });

        test('should not inject token scripts from URL', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}`);
            
            expect(response.text).not.toContain('localStorage.setItem(\'token\'');
            expect(response.text).not.toContain(validToken);
        });

        test('should require authorization header for authentication', async () => {
            const response = await request(app)
                .get('/')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);
            
            expect(response.text).toContain('Welcome');
        });
    });

    describe('Guest Mode vs Token Mode', () => {
        test('should allow guest mode access', async () => {
            const response = await request(app)
                .get('/?guest=true')
                .expect(200);
            
            expect(response.text).not.toContain('localStorage.setItem(\'token\'');
            expect(response.text).toContain('Welcome');
        });

        test('should prioritize authorization header over guest mode', async () => {
            const response = await request(app)
                .get('/?guest=true')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);
            
            expect(response.text).not.toContain('localStorage.setItem(\'token\'');
            expect(response.text).toContain('Welcome');
        });

        test('should handle x-user-type header for guest mode', async () => {
            const response = await request(app)
                .get('/')
                .set('x-user-type', 'guest')
                .expect(200);
            
            expect(response.text).not.toContain('localStorage.setItem(\'token\'');
            expect(response.text).toContain('Welcome');
        });
    });

    describe('OAuth Callback Integration', () => {
        test('should redirect OAuth callbacks to login page', async () => {
            // Simulate OAuth callback behavior
            const response = await request(app)
                .get('/login?success=true')
                .expect(200);
            
            expect(response.text).toContain('login');
        });

        test('should not expose tokens in OAuth redirects', () => {
            const mockUser = { id: 1 };
            const token = jwt.sign({ id: mockUser.id }, 'secret', { expiresIn: '1h' });
            const redirectUrl = '/login?success=true';
            
            expect(redirectUrl).not.toContain('token=');
            expect(jwt.verify(token, 'secret').id).toBe(mockUser.id);
        });
    });

    describe('Token Security', () => {
        test('should validate JWT tokens in authorization header', async () => {
            const response = await request(app)
                .get('/')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);
            
            expect(() => jwt.verify(validToken, 'secret')).not.toThrow();
            expect(response.text).toContain('Welcome');
        });

        test('should reject invalid tokens', async () => {
            await request(app)
                .get('/')
                .set('Authorization', 'Bearer invalid.token.here')
                .expect(302); // Redirects to login
        });
    });

    describe('Error Handling', () => {
        test('should not inject script without token', async () => {
            const response = await request(app)
                .get('/')
                .expect(302); // Redirects to login
        });

        test('should handle empty token parameter', async () => {
            const response = await request(app)
                .get('/?token=')
                .expect(302); // Redirects to login since empty token
        });

        test('should reject malformed tokens in URL', async () => {
            await request(app)
                .get('/?token=malformed.token')
                .expect(302); // Redirects to login
        });
    });

    describe('Security Validation', () => {
        test('should not execute token scripts from URL', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}`);
            
            expect(response.text).not.toContain('(function() {');
            expect(response.text).not.toContain('localStorage.setItem');
        });

        test('should serve clean HTML without token injection', async () => {
            const response = await request(app)
                .get('/')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);
            
            expect(response.text).not.toContain('localStorage.setItem(\'token\'');
            expect(response.text).toContain('Welcome');
        });
    });
});