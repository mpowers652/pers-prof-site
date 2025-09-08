const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock environment
process.env.NODE_ENV = 'test';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';
process.env.GMAIL_USER = 'test@gmail.com';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.OPENAI_ORG_ID = 'test-org-id';
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';
process.env.NOTIFICATION_PHONE_NUMBER = '+0987654321';

// Mock bcrypt first
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
    hashSync: jest.fn().mockReturnValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true)
}));

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

jest.mock('passport', () => ({
    initialize: () => (req, res, next) => next(),
    session: () => (req, res, next) => next(),
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
    authenticate: jest.fn(() => (req, res, next) => next())
}));

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockImplementation((filePath) => {
        if (filePath.includes('index.html')) {
            return '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Welcome</h1></body></html>';
        }
        if (filePath.includes('privacy-policy.html')) {
            return '<html><body>Privacy Policy</body></html>';
        }
        return '<html><body>Default content</body></html>';
    }),
    writeFileSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn().mockReturnValue([]),
    watchFile: jest.fn()
}));

// Import after all mocks are set up
const app = require('./server');

describe('Server Coverage Complete Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Subdomain routing', () => {
        test('should route fft subdomain to /fft-visualizer', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'fft.localhost');
            expect(res.status).toBe(200);
        });

        test('should route math subdomain to /math', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'math.localhost');
            expect(res.status).toBe(200);
        });

        test('should route contact subdomain to /contact', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'contact.localhost');
            expect(res.status).toBe(200);
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

        test('should deny access for basic subscription', async () => {
            const token = jwt.sign({ id: 2 }, 'secret');
            const res = await request(app)
                .get('/story-generator')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(403);
        });

        test('should allow access for admin users', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/story-generator')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
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
        });
    });

    describe('Contact form data deletion', () => {
        test('should handle data deletion request', async () => {
            // Add a user to delete first
            const { users } = require('./server');
            users.push({
                id: 999,
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
            expect(res.body.message).toContain('deleted successfully');
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

        test('should set admin email', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'new-admin@example.com' });
            expect(res.body.success).toBe(true);
        });

        test('should require admin role for email setting', async () => {
            const token = jwt.sign({ id: 2 }, 'secret');
            const res = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'new-admin@example.com' });
            expect(res.status).toBe(403);
        });
    });

    describe('Privacy policy archive', () => {
        test('should serve archived privacy policy', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('<html>Archived Policy</html>');
            
            const res = await request(app).get('/privacy-policy/archive/policy-2023.html');
            expect(res.status).toBe(200);
        });

        test('should list available archives when file not found', async () => {
            const res = await request(app).get('/privacy-policy/archive/nonexistent.html');
            expect(res.status).toBe(404);
            expect(res.text).toContain('NotFoundError');
        });
    });

    describe('Privacy policy change detection', () => {
        test('should detect and handle policy changes', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            fs.readFileSync.mockReturnValue('<html>New Policy</html>');
            
            const res = await request(app)
                .post('/privacy-policy/detect-changes')
                .set('Authorization', `Bearer ${token}`);
            expect(res.body.success).toBe(true);
        });

        test('should require admin access for change detection', async () => {
            const token = jwt.sign({ id: 2 }, 'secret');
            const res = await request(app)
                .post('/privacy-policy/detect-changes')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(403);
        });
    });

    describe('OAuth callbacks', () => {
        test('should handle Google OAuth callback with error', async () => {
            const res = await request(app)
                .get('/auth/google/callback')
                .query({ error: 'access_denied' });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });

        test('should handle Facebook OAuth callback with error', async () => {
            const res = await request(app)
                .get('/auth/facebook/callback')
                .query({ error: 'access_denied' });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });

        test('should redirect to login for invalid OAuth callback', async () => {
            const res = await request(app).get('/auth/google/callback');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });

    describe('Token refresh', () => {
        test('should refresh valid token', async () => {
            const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' });
            const res = await request(app)
                .post('/auth/refresh')
                .set('Authorization', `Bearer ${token}`);
            expect(res.body.token).toBeDefined();
        });

        test('should reject expired token outside refresh window', async () => {
            const expiredTime = Math.floor(Date.now() / 1000) - (25 * 60 * 60); // 25 hours ago
            const token = jwt.sign({ id: 1, exp: expiredTime }, 'secret');
            const res = await request(app)
                .post('/auth/refresh')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(401);
        });
    });

    describe('Root route with different auth states', () => {
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
            expect(res.text).toContain('html');
        });

        test('should redirect invalid token to login', async () => {
            const res = await request(app)
                .get('/')
                .set('Authorization', 'Bearer invalid-token');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });

    describe('Math expression edge cases', () => {
        test('should handle complex number formatting', async () => {
            const res = await request(app)
                .post('/math/calculate')
                .send({ expression: '3 + 4i' });
            expect(res.body.result).toContain('3 + 4i');
        });

        test('should handle pi fraction recognition', async () => {
            const res = await request(app)
                .post('/math/calculate')
                .send({ expression: 'π/6' });
            expect(res.body.result).toBe('π/6');
        });
    });

    describe('Login page cache headers', () => {
        test('should set no-cache headers on login page', async () => {
            const res = await request(app).get('/login');
            expect(res.headers['cache-control']).toContain('no-cache');
            expect(res.headers['pragma']).toBe('no-cache');
            expect(res.headers['expires']).toBe('0');
        });
    });

    describe('Logout functionality', () => {
        test('should clear cookies on logout', async () => {
            const res = await request(app).post('/auth/logout');
            expect(res.body.success).toBe(true);
        });

        test('should redirect to login on GET logout', async () => {
            const res = await request(app).get('/logout');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });

    describe('API key request', () => {
        test('should handle API key request for valid user', async () => {
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/auth/request-api-key')
                .set('Authorization', `Bearer ${token}`);
            expect(res.body.success).toBeDefined();
        });
    });

    describe('Wildcard route', () => {
        test('should redirect unknown GET routes to login', async () => {
            const res = await request(app).get('/unknown-route');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });
});