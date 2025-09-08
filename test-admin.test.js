const request = require('supertest');
const app = require('./server');
const bcrypt = require('bcrypt');

describe('Test Admin Module', () => {
    beforeAll(async () => {
        // Manually create admin user for tests
        const hashedPassword = bcrypt.hashSync('test', 10);
        app.users.push({
            id: 1,
            username: 'admin',
            email: 'admin@test.com',
            password: hashedPassword,
            role: 'admin',
            subscription: 'full'
        });
    });



    test('admin email configuration test setup', async () => {
        // Test admin login functionality
        const loginReq = request(app);
        const response = await loginReq
            .post('/auth/login')
            .send({ username: 'admin', password: 'test' });

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
    });

    test('handles admin login failure', async () => {
        const loginReq = request(app);
        const response = await loginReq
            .post('/auth/login')
            .send({ username: 'admin', password: 'wrongpassword' });

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid credentials');
    });

    test('handles set email request', async () => {
        // First login to get token
        const loginReq = request(app);
        const loginResponse = await loginReq
            .post('/auth/login')
            .send({ username: 'admin', password: 'test' });

        expect(loginResponse.body.success).toBe(true);
        const token = loginResponse.body.token;

        // Test admin email configuration
        const emailReq = request(app);
        const setEmailResponse = await emailReq
            .post('/admin/set-email')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: 'newemail@example.com' });

        expect(setEmailResponse.body.success).toBe(true);
        expect(setEmailResponse.body.message).toBe('Admin email set to newemail@example.com');
    });
});