const request = require('supertest');
const app = require('./server');

describe('Authentication', () => {
    test('should redirect to login from home page', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/login');
    });

    test('should serve login page', async () => {
        const response = await request(app).get('/login');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Login');
        expect(response.text).toContain('Continue as Guest');
    });

    test('should serve register page', async () => {
        const response = await request(app).get('/register');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Register');
    });

    test('should register new user', async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'testuser',
                email: 'test@test.com',
                password: 'password123'
            });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('should login with valid credentials', async () => {
        await request(app)
            .post('/auth/register')
            .send({
                username: 'logintest',
                email: 'login@test.com',
                password: 'password123'
            });

        const response = await request(app)
            .post('/auth/login')
            .send({
                username: 'logintest',
                password: 'password123'
            });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('token');
    });

    test('should reject invalid credentials', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                username: 'nonexistent',
                password: 'wrongpassword'
            });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(false);
    });
});