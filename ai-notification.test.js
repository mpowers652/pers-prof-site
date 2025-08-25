const request = require('supertest');
const app = require('./server');

describe('AI Feature Notification', () => {
    test('should notify user when AI features are unavailable during registration', async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'ainotifytest',
                email: 'ainotify@test.com',
                password: 'password123'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.aiFeatures).toBe(false);
        expect(response.body.message).toContain('AI features are currently unavailable');
        console.log('✓ User notified about AI feature unavailability');
    });
});