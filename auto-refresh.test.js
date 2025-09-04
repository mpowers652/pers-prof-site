const request = require('supertest');
const app = require('./server');

describe('Auto Token Refresh', () => {
    let validToken, expiredToken;

    beforeAll(async () => {
        // Wait for admin user creation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Create tokens for testing
        const jwt = require('jsonwebtoken');
        validToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' });
        expiredToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '-1h' }); // Already expired
    });

    test('should refresh valid token', async () => {
        // Small delay to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await request(app)
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
        expect(response.body.token).not.toBe(validToken);
    });

    test('should refresh recently expired token', async () => {
        const response = await request(app)
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${expiredToken}`)
            .expect(200);

        expect(response.body.token).toBeDefined();
    });

    test('should reject refresh without token', async () => {
        await request(app)
            .post('/auth/refresh')
            .expect(401);
    });
});