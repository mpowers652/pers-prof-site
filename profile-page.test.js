const request = require('supertest');
const app = require('./server');

describe('Profile Page Tests', () => {
    let adminToken;
    let userToken;

    beforeAll(async () => {
        // Login as admin
        const adminLogin = await request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: process.env.NODE_ENV === 'test' ? 'test' : 'admin123' });
        
        if (adminLogin.body.success) {
            adminToken = adminLogin.body.token;
        }

        // Create and login as regular user
        await request(app)
            .post('/auth/register')
            .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });
        
        const userLogin = await request(app)
            .post('/auth/login')
            .send({ username: 'testuser', password: 'password123' });
        
        if (userLogin.body.success) {
            userToken = userLogin.body.token;
        }
    });

    test('should serve profile page for authenticated users', async () => {
        const response = await request(app)
            .get('/profile')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(response.status).toBe(200);
        expect(response.text).toContain('html');
    });

    test('should update username successfully', async () => {
        const response = await request(app)
            .post('/auth/update-profile')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ username: 'newusername' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Profile updated successfully');
    });

    test('should not allow duplicate username', async () => {
        const response = await request(app)
            .post('/auth/update-profile')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ username: 'admin' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Username already exists');
    });

    test('should update password successfully', async () => {
        const response = await request(app)
            .post('/auth/update-profile')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ password: 'newpassword123' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Profile updated successfully');
    });

    test('should handle profile image upload', async () => {
        const response = await request(app)
            .post('/auth/upload-profile-image')
            .set('Authorization', `Bearer ${userToken}`)
            .send({});
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.imageUrl).toContain('/images/profile-');
    });

    test('should require authentication for profile updates', async () => {
        const response = await request(app)
            .post('/auth/update-profile')
            .send({ username: 'hacker' });
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Access denied');
    });

    test('should verify user data includes AI credits', async () => {
        const response = await request(app)
            .get('/auth/verify')
            .set('Cookie', `token=${adminToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body.user).toHaveProperty('aiCredits');
        expect(typeof response.body.user.aiCredits).toBe('number');
    });

    test('should handle email update', async () => {
        const response = await request(app)
            .post('/auth/update-profile')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ email: 'newemail@example.com' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('should not allow duplicate email', async () => {
        const adminUser = await request(app)
            .get('/auth/verify')
            .set('Cookie', `token=${adminToken}`);
        
        if (adminUser.status === 200 && adminUser.body.user) {
            const response = await request(app)
                .post('/auth/update-profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ email: adminUser.body.user.email });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Email already exists');
        } else {
            // Fallback test with known admin email
            const response = await request(app)
                .post('/auth/update-profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ email: 'cartoonsredbob@gmail.com' });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Email already exists');
        }
    });
});