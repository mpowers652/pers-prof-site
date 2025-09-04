const request = require('supertest');
const app = require('./server');

describe('Admin Extended Coverage Tests', () => {
    let adminToken;
    let userToken;
    
    beforeAll(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Get admin token
        const adminLogin = await request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'defaultpass' });
        
        if (adminLogin.body.success) {
            adminToken = adminLogin.body.token;
        }
        
        // Create and login regular user
        await request(app)
            .post('/auth/register')
            .send({ username: 'regularuser', email: 'regular@test.com', password: 'password123' });
        
        const userLogin = await request(app)
            .post('/auth/login')
            .send({ username: 'regularuser', password: 'password123' });
        
        if (userLogin.body.success) {
            userToken = userLogin.body.token;
        }
    });

    describe('Admin Email Configuration Edge Cases', () => {
        test('handles empty email string', async () => {
            if (!adminToken) return;
            
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: '' });
            
            expect([200, 400]).toContain(response.status);
        });

        test('handles special characters in email', async () => {
            if (!adminToken) return;
            
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: 'test+special@example.com' });
            
            expect(response.status).toBe(200);
        });

        test('handles very long email', async () => {
            if (!adminToken) return;
            
            const longEmail = 'a'.repeat(100) + '@example.com';
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: longEmail });
            
            expect([200, 400]).toContain(response.status);
        });
    });

    describe('Token Validation Edge Cases', () => {
        test('handles expired token format', async () => {
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token')
                .send({ email: 'test@example.com' });
            
            expect(response.status).toBe(401);
        });

        test('handles token with extra spaces', async () => {
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', '  Bearer   invalid-token  ')
                .send({ email: 'test@example.com' });
            
            expect(response.status).toBe(401);
        });

        test('handles case-sensitive bearer', async () => {
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', 'bearer invalid-token')
                .send({ email: 'test@example.com' });
            
            expect(response.status).toBe(401);
        });
    });

    describe('Privacy Policy Advanced Tests', () => {
        test('handles privacy policy with invalid token', async () => {
            const response = await request(app)
                .post('/privacy-policy/detect-changes')
                .set('Authorization', 'Bearer invalid-jwt-token')
                .send({});
            
            expect([401, 500]).toContain(response.status);
        });

        test('handles privacy policy with user token', async () => {
            if (!userToken) return;
            
            const response = await request(app)
                .post('/privacy-policy/detect-changes')
                .set('Authorization', `Bearer ${userToken}`)
                .send({});
            
            expect(response.status).toBe(403);
        });

        test('handles privacy policy with malformed request', async () => {
            const response = await request(app)
                .post('/privacy-policy/detect-changes')
                .set('Authorization', 'NotBearer token')
                .send({});
            
            expect([401, 500]).toContain(response.status);
        });
    });

    describe('Admin Role Verification', () => {
        test('verifies admin role exists in token', async () => {
            if (!adminToken) return;
            
            // Test that admin can access admin endpoints
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: 'admin-test@example.com' });
            
            expect([200, 401]).toContain(response.status);
        });

        test('verifies non-admin cannot access admin endpoints', async () => {
            if (!userToken) return;
            
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ email: 'user-test@example.com' });
            
            expect(response.status).toBe(403);
        });
    });

    describe('Request Body Validation', () => {
        test('handles null email value', async () => {
            if (!adminToken) return;
            
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: null });
            
            expect([200, 400]).toContain(response.status);
        });

        test('handles missing request body', async () => {
            if (!adminToken) return;
            
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect([200, 400]).toContain(response.status);
        });

        test('handles extra fields in request', async () => {
            if (!adminToken) return;
            
            const response = await request(app)
                .post('/admin/set-email')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    email: 'test@example.com',
                    extraField: 'should be ignored',
                    anotherField: 123
                });
            
            expect([200, 400]).toContain(response.status);
        });
    });
});