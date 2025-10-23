const request = require('supertest');
const app = require('../server');

describe('Image Proxy', () => {
    test('should accept valid Google profile image URLs', async () => {
        const googleImageUrl = 'https://lh3.googleusercontent.com/test-image';
        
        const response = await request(app)
            .get('/proxy/image')
            .query({ url: googleImageUrl });
        
        // Should not return 400 (bad request) for valid Google URLs
        // May return 500 if the image doesn't exist, but that's expected for test URLs
        expect(response.status).not.toBe(400);
        expect([200, 500]).toContain(response.status);
    });
    
    test('should reject invalid URLs', async () => {
        const invalidUrl = 'https://malicious-site.com/image.jpg';
        
        const response = await request(app)
            .get('/proxy/image')
            .query({ url: invalidUrl })
            .expect(400);
        
        expect(response.text).toBe('Invalid image URL');
    });
    
    test('should require URL parameter', async () => {
        const response = await request(app)
            .get('/proxy/image')
            .expect(400);
        
        expect(response.text).toBe('Invalid image URL');
    });
});