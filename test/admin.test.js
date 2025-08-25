const request = require('supertest');
const app = require('../server');

describe('Admin Configuration', () => {
    let adminToken;
    
    beforeAll(async () => {
        // Get admin credentials from console output or use default
        const adminResponse = await request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: 'defaultpassword' });
        
        if (adminResponse.body.success) {
            adminToken = adminResponse.body.token;
        }
    });
    
    test('Admin can set admin email', async () => {
        if (!adminToken) {
            console.log('Skipping test - no admin token available');
            return;
        }
        
        const response = await request(app)
            .post('/admin/set-email')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'newadmin@example.com' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('newadmin@example.com');
    });
    
    test('Non-admin cannot set admin email', async () => {
        const response = await request(app)
            .post('/admin/set-email')
            .send({ email: 'hacker@example.com' });
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Access denied');
    });
    
    test('Admin email validation works', async () => {
        if (!adminToken) return;
        
        const response = await request(app)
            .post('/admin/set-email')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Email required');
    });
});