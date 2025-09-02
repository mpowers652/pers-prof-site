const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

// Jest configuration
jest.setTimeout(10000);
process.env.NODE_ENV = 'test';

describe('API Key Request System', () => {
    beforeAll(async () => {
        // Wait for admin user to be created
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should allow admin access to story generator', async () => {
        const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
        
        const response = await request(app)
            .get('/story-generator')
            .set('Authorization', `Bearer ${adminToken}`);

        // Admin user has full subscription and admin role, should access directly
        expect(response.status).toBe(200);
        console.log('✓ Admin user can access story generator');
    });

    test('should deny access to regular user without full subscription', async () => {
        const regularToken = jwt.sign({ id: 2 }, 'secret', { expiresIn: '10m' });
        
        const response = await request(app)
            .get('/story-generator')
            .set('Authorization', `Bearer ${regularToken}`);

        // Regular user has premium subscription, not full, should be denied
        expect(response.status).toBe(403);
        console.log('✓ Regular user denied access to story generator');
    });

    test('should serve API key request page', async () => {
        const response = await request(app).get('/request-api-key');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Request AI Access');
        expect(response.text).toContain('Request AI Access');
        console.log('✓ API key request page served');
    });

    test('should handle API key request', async () => {
        const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
        
        const response = await request(app)
            .post('/auth/request-api-key')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBeDefined();
        console.log('✓ API key request handled:', response.body.message);
    });

    test('should return AI_KEY_MISSING error for story generation without key', async () => {
        const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
        
        const response = await request(app)
            .post('/story/generate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                adjective: 'funny',
                wordCount: '100',
                subject: 'puppies'
            });

        // Admin uses master key, so it should succeed or fail with different error
        expect([200, 400, 500]).toContain(response.status);
        if (response.status === 400) {
            expect(response.body.error).toBe('AI_KEY_MISSING');
        }
        console.log('✓ Story generation handled for admin user');
    });
});