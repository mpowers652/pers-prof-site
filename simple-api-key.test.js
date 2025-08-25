const request = require('supertest');
const app = require('./server');

describe('Simple API Key Request Test', () => {
    test('should serve API key request page', async () => {
        const response = await request(app).get('/request-api-key');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Request AI Access');
        console.log('✓ API key request system is working');
    });
});