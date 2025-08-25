const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

describe('API Key Request System', () => {
    test('should redirect to request page when user lacks OpenAI key', async () => {
        const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
        
        const response = await request(app)
            .get('/story-generator')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/request-api-key');
        console.log('✓ User redirected to API key request page');
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

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('AI_KEY_MISSING');
        console.log('✓ AI key missing error returned for story generation');
    });
});