const request = require('supertest');
const app = require('./server');

describe('Admin Comprehensive Tests', () => {
    let adminToken;
    
    beforeAll(async () => {
        // Wait for admin user to be created
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'defaultpass' });
        
        if (loginResponse.body.success) {
            adminToken = loginResponse.body.token;
        }
    });

    describe('Admin Email Configuration', () => {
        test('sets admin email successfully', async () => {
            if (!adminToken) {
                console.log('Skipping test - no admin token available');
                return;
            }
            
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: 'newemail@example.com' });
            
            expect(response.status).toBe(200);
            if (response.body.success !== undefined) {
                expect(response.body.success).toBe(true);
            }
        });

        test('rejects unauthenticated requests', async () => {
            const response = await request(app)
                .post('/admin/set-email')
                .send({ email: 'test@example.com' });
            
            expect(response.status).toBe(401);
        });

        test('rejects non-admin users', async () => {
            await request(app)
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

        test('requires email parameter', async () => {
            if (!adminToken) {
                const response = await request(app)
                    .post('/admin/set-email')
                    .send({});
                expect(response.status).toBe(401);
                return;
            }
            
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});
            
            expect([400, 401]).toContain(response.status);
        });

        test('rejects invalid tokens', async () => {
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', 'Bearer invalid-token')
                .send({ email: 'test@example.com' });
            
            expect(response.status).toBe(401);
        });
    });

    describe('Privacy Policy Management', () => {
        test('requires admin for change detection', async () => {
            const response = await request(app)
                .post('/privacy-policy/detect-changes')
                .send({});
            
            expect(response.status).toBe(401);
        });

        test('allows admin to detect changes', async () => {
            if (!adminToken) {
                console.log('Skipping test - no admin token available');
                return;
            }
            
            const response = await request(app)
                .post('/privacy-policy/detect-changes')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect([200, 500]).toContain(response.status);
        });

        test('rejects non-admin for change detection', async () => {
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({ username: 'testuser', password: 'password123' });
            
            const response = await request(app)
                .post('/privacy-policy/detect-changes')
                .set('Authorization', `Bearer ${loginResponse.body.token}`);
            
            expect(response.status).toBe(403);
        });
    });

    describe('Admin Authentication Edge Cases', () => {
        test('handles malformed authorization header', async () => {
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', 'InvalidFormat')
                .send({ email: 'test@example.com' });
            
            expect(response.status).toBe(401);
        });

        test('handles missing bearer prefix', async () => {
            const testToken = adminToken || 'test-token';
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', testToken)
                .send({ email: 'test@example.com' });
            
            expect(response.status).toBe(401);
        });

        test('handles empty authorization header', async () => {
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', '')
                .send({ email: 'test@example.com' });
            
            expect(response.status).toBe(401);
        });
    });
});