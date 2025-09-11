const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';
process.env.GMAIL_USER = 'test@gmail.com';
process.env.ADMIN_EMAIL = 'admin@test.com';

// Mock Google Cloud Secret Manager
jest.mock('@google-cloud/secret-manager', () => ({
    SecretManagerServiceClient: jest.fn().mockImplementation(() => ({
        accessSecretVersion: jest.fn().mockRejectedValue(new Error('Secret not found'))
    }))
}));

// Mock Gmail API
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

// Mock Twilio
jest.mock('twilio', () => jest.fn().mockReturnValue({
    messages: {
        create: jest.fn().mockResolvedValue({ sid: 'mock-sms-id' })
    }
}));

// Mock OpenAI
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Test AI story content' } }]
                })
            }
        },
        apiKeys: {
            create: jest.fn().mockResolvedValue({ key: 'test-api-key-123' })
        }
    }));
});

// Mock local story generator
jest.mock('./local-story-generator', () => ({
    generateStory: jest.fn().mockResolvedValue('Local generated story')
}));

const app = require('./server');
const { users } = require('./server');

describe('Server Enhanced Coverage Tests', () => {
    beforeEach(() => {
        // Clear users array
        users.length = 0;
        jest.clearAllMocks();
    });

    describe('Subdomain Routing Middleware', () => {
        test('should route fft subdomain to /fft-visualizer', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'fft.example.com');
            expect(res.status).toBe(200);
        });

        test('should route math subdomain to /math', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'math.example.com');
            expect(res.status).toBe(200);
        });

        test('should route contact subdomain to /contact', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'contact.example.com');
            expect(res.status).toBe(200);
        });

        test('should not route localhost', async () => {
            const res = await request(app)
                .get('/')
                .set('Host', 'localhost:3000');
            expect(res.status).toBe(302);
        });
    });

    describe('Story Generator Access Control', () => {
        test('should deny access without token', async () => {
            const res = await request(app).get('/story-generator');
            expect(res.status).toBe(401);
        });

        test('should deny access for basic subscription', async () => {
            users.push({
                id: 1,
                username: 'basic',
                subscription: 'basic',
                role: 'user'
            });
            
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/story-generator')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(403);
        });

        test('should allow access for admin', async () => {
            users.push({
                id: 1,
                username: 'admin',
                subscription: 'basic',
                role: 'admin'
            });
            
            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/story-generator')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
    });

    describe('Story Generation with Custom Content', () => {
        beforeEach(() => {
            users.push({
                id: 1,
                username: 'full',
                subscription: 'full',
                role: 'user'
            });
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

        test('should accept unique custom adjective', async () => {
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
            expect(res.body.customAdded.adjective).toBe('mysterious');
        });
    });

    describe('Contact Form Data Deletion', () => {
        test('should delete user data via contact form', async () => {
            users.push({
                id: 1,
                email: 'test@example.com',
                username: 'testuser'
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
            expect(users.length).toBe(0);
        });
    });

    describe('OAuth Error Handling', () => {
        test('should handle Google OAuth when not configured', async () => {
            const originalClientId = process.env.GMAIL_CLIENT_ID;
            delete process.env.GMAIL_CLIENT_ID;
            
            const res = await request(app).get('/auth/google');
            expect(res.status).toBe(500);
            
            process.env.GMAIL_CLIENT_ID = originalClientId;
        });

        test('should handle OAuth callback without proper parameters', async () => {
            const res = await request(app).get('/auth/google/callback');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });

    describe('Token Refresh Functionality', () => {
        test('should refresh valid token', async () => {
            users.push({
                id: 1,
                username: 'testuser'
            });

            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/auth/refresh')
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });

        test('should reject expired token beyond refresh window', async () => {
            users.push({
                id: 1,
                username: 'testuser'
            });

            const expiredToken = jwt.sign({ 
                id: 1, 
                exp: Math.floor(Date.now() / 1000) - (25 * 60 * 60)
            }, 'secret');
            
            const res = await request(app)
                .post('/auth/refresh')
                .set('Authorization', `Bearer ${expiredToken}`);
            
            expect(res.status).toBe(401);
        });
    });

    describe('Direct Data Deletion API', () => {
        test('should delete user data directly', async () => {
            users.push({
                id: 1,
                email: 'test@example.com'
            });

            const res = await request(app)
                .post('/delete-my-data')
                .send({ email: 'test@example.com' });
            
            expect(res.body.success).toBe(true);
            expect(users.length).toBe(0);
        });

        test('should require email parameter', async () => {
            const res = await request(app)
                .post('/delete-my-data')
                .send({});
            
            expect(res.status).toBe(400);
        });
    });

    describe('Admin Configuration', () => {
        test('should allow admin to set email', async () => {
            users.push({
                id: 1,
                username: 'admin',
                role: 'admin'
            });

            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'newemail@example.com' });
            
            expect(res.body.success).toBe(true);
        });

        test('should deny non-admin access', async () => {
            users.push({
                id: 1,
                username: 'user',
                role: 'user'
            });

            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'newemail@example.com' });
            
            expect(res.status).toBe(403);
        });
    });

    describe('Root Route Security', () => {
        test('should redirect when token in URL', async () => {
            const res = await request(app).get('/?token=some-token');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });

        test('should serve guest page', async () => {
            const res = await request(app).get('/?guest=true');
            expect(res.status).toBe(200);
        });
    });

    describe('API Key Request', () => {
        test('should handle API key request', async () => {
            users.push({
                id: 1,
                username: 'testuser'
            });

            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/auth/request-api-key')
                .set('Authorization', `Bearer ${token}`);
            
            // Should either succeed or fail gracefully
            expect(res.status).toBeLessThan(500);
            expect(res.body).toHaveProperty('success');
        });
    });

    describe('Math Calculator Edge Cases', () => {
        test('should handle whitespace expression', async () => {
            const res = await request(app)
                .post('/math/calculate')
                .send({ expression: '   ' });
            expect(res.body.result).toBe('Please enter an expression');
        });

        test('should handle null expression', async () => {
            const res = await request(app)
                .post('/math/calculate')
                .send({ expression: null });
            expect(res.body.result).toBe('Please enter an expression');
        });
    });

    describe('Authentication Verification', () => {
        test('should verify user with premium subscription', async () => {
            users.push({
                id: 1,
                username: 'premium',
                subscription: 'premium',
                role: 'user'
            });

            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.body.user.hideAds).toBe(true);
        });

        test('should handle user not found', async () => {
            const token = jwt.sign({ id: 999 }, 'secret');
            const res = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.status).toBe(404);
        });
    });

    describe('Logout Functionality', () => {
        test('should handle POST logout', async () => {
            const res = await request(app).post('/auth/logout');
            expect(res.body.success).toBe(true);
        });

        test('should handle GET logout redirect', async () => {
            const res = await request(app).get('/logout');
            expect(res.status).toBe(302);
        });
    });

    describe('Create Admin Endpoint', () => {
        test('should handle admin creation when admin exists', async () => {
            // Add an admin user first
            users.push({
                id: 1,
                role: 'admin'
            });

            const res = await request(app).post('/create-admin');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Admin already exists');
        });
    });

    describe('Wildcard Route', () => {
        test('should redirect unknown routes to login', async () => {
            const res = await request(app).get('/unknown-route');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/login');
        });
    });
});