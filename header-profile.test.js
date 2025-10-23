const request = require('supertest');
const app = require('./server');

describe('Header Profile Link', () => {
    let server;

    beforeAll(async () => {
        server = app.listen(0);
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    test('should serve index with header bundle', async () => {
        const response = await request(app).get('/?guest=true');
        expect(response.status).toBe(200);
        expect(response.text).toContain('header.bundle.js');
    });

    test('should serve profile page', async () => {
        const response = await request(app).get('/profile');
        expect(response.status).toBe(200);
        expect(response.text).toContain('User Profile');
    });
});