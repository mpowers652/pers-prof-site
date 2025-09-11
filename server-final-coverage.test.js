const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';

// Mock dependencies
jest.mock('@google-cloud/secret-manager', () => ({
    SecretManagerServiceClient: jest.fn().mockImplementation(() => ({
        accessSecretVersion: jest.fn().mockRejectedValue(new Error('Secret not found'))
    }))
}));

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

jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'AI generated story' } }]
                })
            }
        },
        apiKeys: {
            create: jest.fn().mockResolvedValue({ key: 'test-api-key' })
        }
    }));
});

jest.mock('./local-story-generator', () => ({
    generateStory: jest.fn().mockResolvedValue('Local story')
}));

const app = require('./server');
const { users, evaluateExpression } = require('./server');

describe('Server Final Coverage Tests', () => {
    beforeEach(() => {
        users.length = 0;
        jest.clearAllMocks();
    });

    describe('User Registration Edge Cases', () => {
        test('should handle duplicate username registration', async () => {
            users.push({
                id: 1,
                username: 'existing',
                email: 'existing@test.com'
            });

            const res = await request(app)
                .post('/auth/register')
                .send({
                    username: 'existing',
                    email: 'new@test.com',
                    password: 'password123'
                });
            
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Username already exists');
        });

        test('should handle registration with OpenAI key generation', async () => {
            process.env.OPENAI_MASTER_API_KEY = 'master-key';
            process.env.OPENAI_ORG_ID = 'org-123';

            const res = await request(app)
                .post('/auth/register')
                .send({
                    username: 'newuser',
                    email: 'new@test.com',
                    password: 'password123'
                });
            
            expect(res.body.success).toBe(true);
            expect(res.body.aiFeatures).toBe(true);
        });
    });

    describe('Story Generation Fallback Scenarios', () => {
        beforeEach(() => {
            users.push({
                id: 1,
                username: 'full',
                subscription: 'full',
                role: 'user'
            });
        });

        test('should fallback to local generator when OpenAI fails', async () => {
            // Mock OpenAI to fail
            const OpenAI = require('openai');
            OpenAI.mockImplementation(() => ({
                chat: {
                    completions: {
                        create: jest.fn().mockRejectedValue(new Error('API Error'))
                    }
                }
            }));

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
            expect(res.body.source).toBe('local');
        });

        test('should provide final fallback when all generators fail', async () => {
            // Mock both to fail
            const OpenAI = require('openai');
            OpenAI.mockImplementation(() => ({
                chat: {
                    completions: {
                        create: jest.fn().mockRejectedValue(new Error('API Error'))
                    }
                }
            }));

            const localGenerator = require('./local-story-generator');
            localGenerator.generateStory.mockRejectedValue(new Error('Local Error'));

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
            expect(res.body.story).toContain('Once upon a time');
        });
    });

    describe('Math Expression Evaluation Edge Cases', () => {
        test('should handle complex number formatting', () => {
            // Test complex number with real and imaginary parts
            const result = evaluateExpression('3 + 4*i');
            expect(typeof result).toBe('string');
        });

        test('should handle pi fraction recognition', () => {
            const result = evaluateExpression('asin(1)');
            expect(result).toBe('π/2');
        });

        test('should handle symbolic expressions', () => {
            const result = evaluateExpression('x + y');
            expect(typeof result).toBe('string');
        });

        test('should handle invalid expressions gracefully', () => {
            const result = evaluateExpression('invalid+++expression');
            expect(typeof result).toBe('string');
        });
    });

    describe('Authentication Cookie Handling', () => {
        test('should authenticate with cookie token', async () => {
            users.push({
                id: 1,
                username: 'cookieuser'
            });

            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/auth/verify')
                .set('Cookie', `token=${token}`);
            
            expect(res.body.user.username).toBe('cookieuser');
        });

        test('should handle story generator access with cookie', async () => {
            users.push({
                id: 1,
                username: 'full',
                subscription: 'full',
                role: 'user'
            });

            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .get('/story-generator')
                .set('Cookie', `token=${token}`);
            
            expect(res.status).toBe(200);
        });
    });

    describe('Contact Form SMS Integration', () => {
        test('should handle contact form with SMS notification', async () => {
            process.env.TWILIO_ACCOUNT_SID = 'test-sid';
            process.env.TWILIO_AUTH_TOKEN = 'test-token';
            process.env.TWILIO_PHONE_NUMBER = '+1234567890';
            process.env.NOTIFICATION_PHONE_NUMBER = '+0987654321';

            const res = await request(app)
                .post('/contact')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    subject: 'Test Subject',
                    message: 'Test message'
                });
            
            expect(res.body.success).toBe(true);
        });
    });

    describe('Privacy Policy Archive Handling', () => {
        test('should serve request-api-key page', async () => {
            const res = await request(app).get('/request-api-key');
            expect(res.status).toBe(200);
        });

        test('should serve privacy policy page', async () => {
            const res = await request(app).get('/privacy-policy');
            expect(res.status).toBe(200);
        });
    });

    describe('Login Page Caching Headers', () => {
        test('should set no-cache headers on login page', async () => {
            const res = await request(app).get('/login');
            expect(res.headers['cache-control']).toContain('no-cache');
            expect(res.headers['pragma']).toBe('no-cache');
            expect(res.headers['expires']).toBe('0');
        });
    });

    describe('User Authentication Flow', () => {
        test('should handle login with valid credentials', async () => {
            // Create a user with hashed password
            const bcrypt = require('bcrypt');
            const hashedPassword = bcrypt.hashSync('password123', 10);
            
            users.push({
                id: 1,
                username: 'testuser',
                password: hashedPassword
            });

            const res = await request(app)
                .post('/auth/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                });
            
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
        });

        test('should reject login with invalid username', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    username: 'nonexistent',
                    password: 'password123'
                });
            
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });

        test('should reject login with invalid password', async () => {
            const bcrypt = require('bcrypt');
            const hashedPassword = bcrypt.hashSync('correctpassword', 10);
            
            users.push({
                id: 1,
                username: 'testuser',
                password: hashedPassword
            });

            const res = await request(app)
                .post('/auth/login')
                .send({
                    username: 'testuser',
                    password: 'wrongpassword'
                });
            
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });
    });

    describe('Guest Mode Functionality', () => {
        test('should handle guest mode via header', async () => {
            const res = await request(app)
                .get('/')
                .set('x-user-type', 'guest');
            
            expect(res.status).toBe(200);
        });
    });

    describe('Error Handling', () => {
        test('should handle story generation server error', async () => {
            users.push({
                id: 1,
                username: 'full',
                subscription: 'full',
                role: 'user'
            });

            const token = jwt.sign({ id: 1 }, 'secret');
            const res = await request(app)
                .post('/story/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({}); // Missing required fields
            
            expect(res.status).toBe(500);
        });
    });
});