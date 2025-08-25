const request = require('supertest');
const app = require('./server');

describe('Admin Configuration', () => {
    test('Admin email configuration works', async () => {
        // Login as admin
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: process.env.ADMIN_PASSWORD });
        
        expect(loginResponse.body.success).toBe(true);
        const token = loginResponse.body.token;
        
        // Set new admin email
        const setEmailResponse = await request(app)
            .post('/admin/set-email')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: 'newemail@example.com' });
        
        expect(setEmailResponse.body.success).toBe(true);
        expect(setEmailResponse.body.message).toContain('newemail@example.com');
    });
});