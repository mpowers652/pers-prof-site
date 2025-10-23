const request = require('supertest');
const app = require('./server');

describe('StoryGenerator User Status Check', () => {
    let server;
    let adminToken;

    beforeAll(async () => {
        server = app.listen(0);
        
        // Login as admin to get token
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: 'test' });
        
        console.log('Login response:', loginResponse.status, loginResponse.body);
        expect(loginResponse.body.success).toBe(true);
        adminToken = loginResponse.body.token;
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    test('should verify user authentication for story generation', async () => {
        const response = await request(app)
            .get('/auth/verify')
            .set('Authorization', `Bearer ${adminToken}`);
        
        console.log('Verify response:', response.status, response.body);
        expect(response.status).toBe(200);
        expect(response.body.user).toBeDefined();
        expect(response.body.user.role).toBe('admin');
        expect(response.body.user.subscription).toBe('full');
    });

    test('should allow story generation with valid admin token', async () => {
        const response = await request(app)
            .post('/story/generate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                adjective: 'funny',
                wordCount: '200',
                subject: 'puppies'
            });
        
        expect(response.status).toBe(200);
        expect(response.body.story).toBeDefined();
        expect(typeof response.body.story).toBe('string');
    });

    test('should reject story generation without token', async () => {
        const response = await request(app)
            .post('/story/generate')
            .send({
                adjective: 'funny',
                wordCount: '200',
                subject: 'puppies'
            });
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Access denied');
    });

    test('should return user info via whoami endpoint', async () => {
        const response = await request(app)
            .get('/auth/whoami')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.id).toBeDefined();
        expect(response.body.username).toBe('admin');
        expect(response.body.role).toBe('admin');
        expect(response.body.subscription).toBe('full');
    });
});