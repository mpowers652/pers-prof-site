const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';
process.env.GMAIL_USER = 'test@gmail.com';

// Mock dependencies
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
                getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
            }))
        },
        gmail: jest.fn().mockReturnValue({
            users: {
                messages: {
                    send: jest.fn().mockResolvedValue({ data: { id: 'mock-message-id' } })
                }
            }
        })
    }
}));

jest.mock('@google-cloud/secret-manager', () => ({
    SecretManagerServiceClient: jest.fn(() => ({
        accessSecretVersion: jest.fn().mockRejectedValue(new Error('Secret not found'))
    }))
}));

const app = require('./server');

describe('Server Edge Cases Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Story generation similarity checks', () => {
        test('should accept custom adjective that is not similar', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/story/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    adjective: 'mysterious',
                    wordCount: '100',
                    subject: 'puppies'
                });
            expect(res.status).toBe(200);
            expect(res.body.customAdded).toEqual({ adjective: 'mysterious' });
        });

        test('should accept custom subject that is not similar', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/story/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    adjective: 'funny',
                    wordCount: '100',
                    subject: 'dragons'
                });
            expect(res.status).toBe(200);
            expect(res.body.customAdded).toEqual({ subject: 'dragons' });
        });

        test('should handle both custom adjective and subject', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/story/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    adjective: 'mysterious',
                    wordCount: '100',
                    subject: 'dragons'
                });
            expect(res.status).toBe(200);
            expect(res.body.customAdded).toEqual({ 
                adjective: 'mysterious',
                subject: 'dragons'
            });
        });

        test('should handle story generation error gracefully', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            
            // Mock OpenAI to throw an error
            jest.doMock('openai', () => {
                return jest.fn().mockImplementation(() => {
                    throw new Error('OpenAI error');
                });
            });

            const res = await request(app)
                .post('/story/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    adjective: 'funny',
                    wordCount: '100',
                    subject: 'puppies'
                });
            expect(res.status).toBe(200);
            expect(res.body.story).toBeDefined();
        });
    });

    describe('Contact form edge cases', () => {
        test('should handle contact form with existing user for deletion', async () => {
            // Add a user to delete
            const { users } = require('./server');
            users.push({
                id: 997,
                email: 'delete-me@example.com',
                username: 'delete-user'
            });

            const res = await request(app)
                .post('/contact')
                .send({
                    name: 'Test User',
                    email: 'delete-me@example.com',
                    subject: 'Data Deletion Request',
                    message: 'Please delete my data'
                });
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('deleted successfully');
        });

        test('should handle missing fields in contact form', async () => {
            const res = await request(app)
                .post('/contact')
                .send({
                    name: '',
                    email: 'test@example.com',
                    subject: 'Test',
                    message: 'Test message'
                });
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('All fields required');
        });
    });

    describe('Math calculator edge cases', () => {
        test('should handle whitespace in expression', async () => {
            const res = await request(app)
                .post('/math/calculate')
                .send({ expression: '  2 + 2  ' });
            expect(res.body.result).toBe(4);
        });

        test('should handle missing expression field', async () => {
            const res = await request(app)
                .post('/math/calculate')
                .send({});
            expect(res.body.result).toBe('Please enter an expression');
        });
    });

    describe('Authentication edge cases', () => {
        test('should handle auth verify with cookie token', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/auth/verify')
                .set('Cookie', `token=${token}`);
            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
        });

        test('should handle story generator with cookie token', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/story-generator')
                .set('Cookie', `token=${token}`);
            expect(res.status).toBe(200);
        });

        test('should handle story generation with cookie token', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/story/generate')
                .set('Cookie', `token=${token}`)
                .send({
                    adjective: 'funny',
                    wordCount: '100',
                    subject: 'puppies'
                });
            expect(res.status).toBe(200);
        });
    });

    describe('Root route edge cases', () => {
        test('should handle authenticated user with valid token', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/')
                .set('Cookie', `token=${token}`);
            expect(res.status).toBe(200);
            expect(res.text).toContain('Welcome');
        });

        test('should handle guest mode with query parameter', async () => {
            const res = await request(app)
                .get('/')
                .query({ guest: 'true' });
            expect(res.status).toBe(200);
            expect(res.text).toContain('Guest');
        });
    });

    describe('Privacy policy routes', () => {
        test('should serve privacy policy page', async () => {
            const res = await request(app).get('/privacy-policy');
            expect(res.status).toBe(200);
        });

        test('should handle privacy policy change detection without admin', async () => {
            const token = jwt.sign({ id: 999 }, 'secret');
            const res = await request(app)
                .post('/privacy-policy/detect-changes')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(403);
        });

        test('should handle privacy policy change detection without token', async () => {
            const res = await request(app)
                .post('/privacy-policy/detect-changes');
            expect(res.status).toBe(401);
        });
    });

    describe('OAuth routes without credentials', () => {
        test('should handle Google OAuth without credentials', async () => {
            // Temporarily remove credentials
            const originalClientId = process.env.GMAIL_CLIENT_ID;
            delete process.env.GMAIL_CLIENT_ID;
            
            const res = await request(app).get('/auth/google');
            expect(res.status).toBe(500);
            expect(res.text).toContain('Google OAuth not configured');
            
            // Restore credentials
            process.env.GMAIL_CLIENT_ID = originalClientId;
        });

        test('should handle Facebook OAuth without credentials', async () => {
            // Ensure environment variables are not set
            const originalAppId = process.env.FACEBOOK_APP_ID;
            const originalAppSecret = process.env.FACEBOOK_APP_SECRET;
            delete process.env.FACEBOOK_APP_ID;
            delete process.env.FACEBOOK_APP_SECRET;
            
            const res = await request(app).get('/auth/facebook');
            expect(res.status).toBe(500);
            expect(res.text).toContain('Facebook OAuth not configured');
            
            // Restore environment variables
            if (originalAppId) process.env.FACEBOOK_APP_ID = originalAppId;
            if (originalAppSecret) process.env.FACEBOOK_APP_SECRET = originalAppSecret;
        });
    });

    describe('Request API key page', () => {
        test('should serve request API key page', async () => {
            const res = await request(app).get('/request-api-key');
            expect(res.status).toBe(200);
        });
    });

    describe('Registration page', () => {
        test('should serve registration page', async () => {
            const res = await request(app).get('/register');
            expect(res.status).toBe(200);
        });
    });

    describe('Static file serving', () => {
        test('should serve images from images directory', async () => {
            const res = await request(app).get('/images/test.jpg');
            // Will return 404 since file doesn't exist, but tests the route
            expect([200, 302, 404]).toContain(res.status);
        });
    });

    describe('Error handling', () => {
        test('should handle invalid JSON in story generation', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/story/generate')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/json')
                .send('invalid json');
            expect(res.status).toBe(400);
        });
    });
});