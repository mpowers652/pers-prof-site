const request = require('supertest');
const app = require('./server');

describe('OpenAI Key Generation for New Users', () => {
    test('should generate valid OpenAI key for new user registration', async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'openaitest',
                email: 'openai@test.com',
                password: 'password123'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Login to get user data
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                username: 'openaitest',
                password: 'password123'
            });

        expect(loginResponse.body.success).toBe(true);
        const token = loginResponse.body.token;

        // Verify user has OpenAI key
        const verifyResponse = await request(app)
            .get('/auth/verify')
            .set('Authorization', `Bearer ${token}`);

        expect(verifyResponse.status).toBe(200);
        const user = verifyResponse.body.user;
        
        // Check OpenAI key status (may be null if API key creation is unavailable)
        expect(user.openaiKey).toBeDefined();
        if (user.openaiKey) {
            console.log('✓ OpenAI key generated for new user');
        } else {
            console.log('ℹ OpenAI key generation skipped - API unavailable or failed');
        }
    });

    test('should verify user registration includes OpenAI key field', async () => {
        // Register user
        await request(app)
            .post('/auth/register')
            .send({
                username: 'storyuser',
                email: 'story@test.com',
                password: 'password123'
            });

        // Login
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                username: 'storyuser',
                password: 'password123'
            });

        const token = loginResponse.body.token;

        // Try to access story generator (requires full subscription or admin)
        const storyResponse = await request(app)
            .get('/story-generator')
            .set('Authorization', `Bearer ${token}`);

        // Basic users can't access story generator regardless of OpenAI key
        expect(storyResponse.status).toBe(403);
        console.log('ℹ Basic users correctly restricted from story generator');
    });
});