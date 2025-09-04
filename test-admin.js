const request = require('supertest');
const app = require('./server');

describe('Admin Configuration', () => {
    let adminToken;
    
    beforeAll(async () => {
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: process.env.ADMIN_PASSWORD });
        adminToken = loginResponse.body.token;
    });

    test('Admin email configuration works', async () => {
        const setEmailResponse = await request(app)
            .post('/admin/set-email')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'newemail@example.com' });
        
        expect(setEmailResponse.body.success).toBe(true);
        expect(setEmailResponse.body.message).toContain('newemail@example.com');
    });

    test('Admin email requires authentication', async () => {
        const response = await request(app)
            .post('/admin/set-email')
            .send({ email: 'test@example.com' });
        
        expect(response.status).toBe(401);
    });

    test('Admin email requires admin role', async () => {
        const userResponse = await request(app)
            .post('/auth/register')
            .send({ username: 'testuser', email: 'user@test.com', password: 'password123' });
        
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ username: 'testuser', password: 'password123' });
        
        const response = await request(app)
            .post('/admin/set-email')
            .set('Authorization', `Bearer ${loginResponse.body.token}`)
            .send({ email: 'test@example.com' });
        
        expect(response.status).toBe(403);
    });

    test('Admin email requires valid email', async () => {
        const response = await request(app)
            .post('/admin/set-email')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        expect(response.status).toBe(400);
    });

    test('Privacy policy change detection requires admin', async () => {
        const response = await request(app)
            .post('/privacy-policy/detect-changes')
            .send({});
        
        expect(response.status).toBe(401);
    });

    test('Privacy policy change detection works for admin', async () => {
        const response = await request(app)
            .post('/privacy-policy/detect-changes')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(response.body.success).toBe(true);
    });
});

describe('Admin Authentication', () => {
    test('Invalid token rejected', async () => {
        const response = await request(app)
            .post('/admin/set-email')
            .set('Authorization', 'Bearer invalid-token')
            .send({ email: 'test@example.com' });
        
        expect(response.status).toBe(401);
    });

    test('Missing authorization header', async () => {
        const response = await request(app)
            .post('/admin/set-email')
            .send({ email: 'test@example.com' });
        
        expect(response.status).toBe(401);
    });
});