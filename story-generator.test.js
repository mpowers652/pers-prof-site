const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

describe('Story Generator', () => {
    let adminToken;
    
    beforeAll(() => {
        adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' });
    });

    test('should deny access without full subscription', async () => {
        const response = await request(app).get('/story-generator');
        expect(response.status).toBe(401);
        expect(response.text).toContain('Access denied');
    });

    test('should allow access with admin token', async () => {
        const response = await request(app)
            .get('/story-generator')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        expect(response.text).toContain('Story Generator');
    });

    test('should generate story with valid inputs', async () => {
        const response = await request(app)
            .post('/story/generate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                adjective: 'funny',
                wordCount: '200',
                subject: 'puppies'
            });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('story');
    });

    test('should reject custom input too similar to existing', async () => {
        const response = await request(app)
            .post('/story/generate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                adjective: 'scary',
                wordCount: '200',
                subject: 'zombie'
            });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('too similar');
    });

    test('should accept viable custom input', async () => {
        const response = await request(app)
            .post('/story/generate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                adjective: 'mysterious',
                wordCount: '200',
                subject: 'ancient artifacts'
            });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('customAdded');
    });

    test('should contain predefined options in HTML', async () => {
        const response = await request(app)
            .get('/story-generator')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.text).toContain('funny');
        expect(response.text).toContain('scary');
        expect(response.text).toContain('200');
        expect(response.text).toContain('1000');
    });
});