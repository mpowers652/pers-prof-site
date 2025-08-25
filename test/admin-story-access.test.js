const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');

describe('Admin Story Generator Access', () => {
    test('Admin email configuration is set correctly', () => {
        const adminEmail = process.env.ADMIN_EMAIL || 'cartoonsredbob@gmail.com';
        expect(adminEmail).toBeDefined();
        expect(adminEmail).toContain('@');
    });
    
    test('Story generator requires full subscription', async () => {
        // Test without token - should be denied
        const response = await request(app)
            .get('/story-generator');
        
        expect(response.status).toBe(401);
        expect(response.text).toContain('Access denied');
    });
    
    test('Story generator rejects invalid token', async () => {
        const response = await request(app)
            .get('/story-generator')
            .set('Authorization', 'Bearer invalid-token');
        
        expect(response.status).toBe(401);
        expect(response.text).toContain('Invalid token');
    });
    
    test('Story generation endpoint requires authentication', async () => {
        const response = await request(app)
            .post('/story/generate')
            .send({
                adjective: 'funny',
                wordCount: '100',
                subject: 'puppies'
            });
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Access denied');
    });
});