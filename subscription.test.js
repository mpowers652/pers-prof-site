const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

describe('Subscription Access', () => {
    let regularToken, adminToken;
    
    beforeAll(async () => {
        // Wait for admin user creation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Regular user without full subscription
        regularToken = jwt.sign({ id: 999 }, 'secret', { expiresIn: '1h' });
        // Admin user with full subscription
        adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' });
    });

    test('should deny story generator access to regular user', async () => {
        const response = await request(app)
            .get('/story-generator')
            .set('Authorization', `Bearer ${regularToken}`);
        expect(response.status).toBe(403);
        expect(response.text).toContain('Full subscription required');
    });

    test('should allow story generator access to admin', async () => {
        const response = await request(app)
            .get('/story-generator')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
    });

    test('should allow math calculator access to all users', async () => {
        const response = await request(app)
            .get('/math')
            .set('Authorization', `Bearer ${regularToken}`);
        expect(response.status).toBe(200);
    });

    test('should deny story generation to regular user', async () => {
        const response = await request(app)
            .post('/story/generate')
            .set('Authorization', `Bearer ${regularToken}`)
            .send({
                adjective: 'funny',
                wordCount: '200',
                subject: 'puppies'
            });
        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Full subscription required');
    });
});