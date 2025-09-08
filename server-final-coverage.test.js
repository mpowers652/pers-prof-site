const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set test environment first
process.env.NODE_ENV = 'test';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';
process.env.GMAIL_USER = 'test@gmail.com';

// Mock all external dependencies
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

jest.mock('twilio', () => jest.fn(() => ({
    messages: {
        create: jest.fn().mockResolvedValue({ sid: 'mock-sms-id' })
    }
})));

jest.mock('@google-cloud/secret-manager', () => ({
    SecretManagerServiceClient: jest.fn(() => ({
        accessSecretVersion: jest.fn().mockRejectedValue(new Error('Secret not found'))
    }))
}));

const app = require('./server');

describe('Server Final Coverage Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Subdomain routing middleware', () => {
        test('should route fft subdomain', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'fft.example.com');
            expect(res.status).toBe(200);
        });

        test('should route math subdomain', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'math.example.com');
            expect(res.status).toBe(200);
        });

        test('should route contact subdomain', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'contact.example.com');
            expect(res.status).toBe(200);
        });

        test('should not route localhost subdomain', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'localhost:3000');
            expect(res.status).toBe(302);
        });
    });

    describe('Story generator access control', () => {
        test('should deny access without token', async () => {
            const res = await request(app).get('/story-generator');
            expect(res.status).toBe(401);
            expect(res.text).toContain('Access denied');
        });

        test('should deny access with invalid token', async () => {
            const res = await request(app)
                .get('/story-generator')
                .set('Authorization', 'Bearer invalid-token');
            expect(res.status).toBe(401);
        });

        test('should allow access for admin users', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/story-generator')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });

        test('should deny access for basic subscription users', async () => {
            // Create a user with basic subscription
            const { users } = require('./server');
            users.push({
                id: 999,
                username: 'basic-user',
                subscription: 'basic',
                role: 'user'
            });

            const token = jwt.sign({ id: 999 }, 'secret');
            const res = await request(app)
                .get('/story-generator')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(403);
        });
    });

    describe('Story generation API', () => {
        test('should generate story with valid parameters', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
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

        test('should reject similar custom adjective', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/story/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    adjective: 'funniest',
                    wordCount: '100',
                    subject: 'puppies'
                });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('similar');
        });

        test('should reject similar custom subject', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/story/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    adjective: 'funny',
                    wordCount: '100',
                    subject: 'puppy'
                });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('similar');
        });

        test('should handle story generation without token', async () => {
            const res = await request(app)
                .post('/story/generate')
                .send({
                    adjective: 'funny',
                    wordCount: '100',
                    subject: 'puppies'
                });
            expect(res.status).toBe(401);
        });
    });

    describe('Contact form data deletion', () => {
        test('should handle data deletion request', async () => {
            // Add a user to delete first
            const { users } = require('./server');
            users.push({
                id: 997,
                email: 'test@example.com',
                username: 'test-user'
            });
            
            const res = await request(app)
                .post('/contact')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    subject: 'Data Deletion Request',
                    message: 'Please delete my data'
                });
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('deleted');
        });
    });

    describe('Direct data deletion endpoint', () => {
        test('should delete user data by email', async () => {
            const res = await request(app)
                .post('/delete-my-data')
                .send({ email: 'test@example.com' });
            expect(res.body.success).toBe(true);
        });

        test('should require email parameter', async () => {
            const res = await request(app)
                .post('/delete-my-data')
                .send({});
            expect(res.status).toBe(400);
        });
    });

    describe('Admin endpoints', () => {
        test('should create admin user', async () => {
            const res = await request(app).post('/create-admin');
            expect(res.body.success).toBe(true);
        });

        test('should set admin email with valid admin token', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'new-admin@example.com' });
            expect(res.body.success).toBe(true);
        });

        test('should require admin role for email setting', async () => {
            const { users } = require('./server');
            users.push({
                id: 998,
                username: 'regular-user',
                role: 'user'
            });

            const token = jwt.sign({ id: 998 }, 'secret');
            const res = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'new-admin@example.com' });
            expect(res.status).toBe(403);
        });

        test('should require email in admin set-email request', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(400);
        });
    });

    describe('Token refresh functionality', () => {
        test('should refresh valid token', async () => {
            const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' });
            const res = await request(app)
                .post('/auth/refresh')
                .set('Authorization', `Bearer ${token}`);
            expect(res.body.token).toBeDefined();
        });

        test('should reject token without authorization header', async () => {
            const res = await request(app).post('/auth/refresh');
            expect(res.status).toBe(401);
        });

        test('should reject expired token outside refresh window', async () => {
            const expiredTime = Math.floor(Date.now() / 1000) - (25 * 60 * 60); // 25 hours ago
            const token = jwt.sign({ id: 1, exp: expiredTime }, 'secret');
            const res = await request(app)
                .post('/auth/refresh')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(401);
        });

        test('should handle user not found in refresh', async () => {
            const token = jwt.sign({ id: 9999 }, 'secret');
            const res = await request(app)
                .post('/auth/refresh')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });
    });

    describe('Root route authentication states', () => {
        test('should redirect URL token to login for security', async () => {
            const res = await request(app)
                .get('/')
                .query({ token: 'some-token' });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });

        test('should serve guest mode', async () => {
            const res = await request(app)
                .get('/')
                .set('x-user-type', 'guest');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Guest');
        });

        test('should redirect invalid token to login', async () => {
            const res = await request(app)
                .get('/')
                .set('Authorization', 'Bearer invalid-token');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });

        test('should redirect user not found to login', async () => {
            const token = jwt.sign({ id: 9999 }, 'secret');
            const res = await request(app)
                .get('/')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });

    describe('Login page functionality', () => {
        test('should set no-cache headers on login page', async () => {
            const res = await request(app).get('/login');
            expect(res.headers['cache-control']).toContain('no-cache');
            expect(res.headers['pragma']).toBe('no-cache');
            expect(res.headers['expires']).toBe('0');
        });
    });

    describe('Logout functionality', () => {
        test('should clear cookies on POST logout', async () => {
            const res = await request(app).post('/auth/logout');
            expect(res.body.success).toBe(true);
        });

        test('should redirect to login on GET logout', async () => {
            const res = await request(app).get('/logout');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });

    describe('API key request functionality', () => {
        test('should handle API key request for valid user', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/auth/request-api-key')
                .set('Authorization', `Bearer ${token}`);
            expect(res.body.success).toBeDefined();
        });

        test('should require authorization for API key request', async () => {
            const res = await request(app).post('/auth/request-api-key');
            expect(res.status).toBe(401);
        });

        test('should handle user not found for API key request', async () => {
            const token = jwt.sign({ id: 9999 }, 'secret');
            const res = await request(app)
                .post('/auth/request-api-key')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });
    });

    describe('Wildcard route', () => {
        test('should redirect unknown GET routes to login', async () => {
            const res = await request(app).get('/unknown-route-12345');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });

    describe('Math expression edge cases', () => {
        test('should handle empty expression', async () => {
            const res = await request(app)
                .post('/math/calculate')
                .send({ expression: '' });
            expect(res.body.result).toBe('Please enter an expression');
        });

        test('should handle whitespace-only expression', async () => {
            const res = await request(app)
                .post('/math/calculate')
                .send({ expression: '   ' });
            expect(res.body.result).toBe('Please enter an expression');
        });
    });

    describe('Auth verification edge cases', () => {
        test('should handle missing user in auth verify', async () => {
            const token = jwt.sign({ id: 9999 }, 'secret');
            const res = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        test('should handle invalid token in auth verify', async () => {
            const res = await request(app)
                .get('/auth/verify')
                .set('Authorization', 'Bearer invalid-token');
            expect(res.status).toBe(401);
        });
    });
});