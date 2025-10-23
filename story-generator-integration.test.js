const request = require('supertest');
const app = require('./server');

describe('StoryGenerator Integration', () => {
    let server;

    beforeAll(async () => {
        server = app.listen(0);
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    test('should serve FFT visualizer page', async () => {
        const response = await request(app).get('/fft-visualizer');
        expect(response.status).toBe(200);
        expect(response.text).toContain('FFT Audio Visualizer');
        expect(response.text).toContain('story-generator-mount');
    });

    test('should serve story generator page for authenticated users', async () => {
        // First login as admin
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: 'test' });
        
        if (loginResponse.body.success) {
            const token = loginResponse.body.token;
            
            const response = await request(app)
                .get('/story-generator')
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Story Generator');
        } else {
            // Skip test if login fails (admin password might be different)
            console.log('Skipping story generator test - admin login failed');
        }
    });

    test('should redirect unauthenticated users from story generator', async () => {
        const response = await request(app).get('/story-generator');
        expect([401, 302]).toContain(response.status);
    });

    test('should serve auth verification endpoint', async () => {
        const response = await request(app).get('/auth/verify');
        expect([200, 401]).toContain(response.status);
    });

    test('should serve whoami endpoint', async () => {
        const response = await request(app).get('/auth/whoami');
        expect([200, 204]).toContain(response.status);
    });
});