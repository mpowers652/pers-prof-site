const request = require('supertest');
const app = require('./server');

describe('Profile Page', () => {
    let server;

    beforeAll(async () => {
        server = app.listen(0);
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    test('should serve profile page', async () => {
        const response = await request(app).get('/profile');
        expect(response.status).toBe(200);
        expect(response.text).toContain('User Profile');
        expect(response.text).toContain('Loading profile...');
    });

    test('should include profile verification script', async () => {
        const response = await request(app).get('/profile');
        expect(response.text).toContain('/auth/verify');
        expect(response.text).toContain('loadProfile');
    });
});