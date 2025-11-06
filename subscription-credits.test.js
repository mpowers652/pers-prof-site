const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

describe('Subscription AI Credits', () => {
    let testUser, token;
    
    beforeEach(() => {
        const users = require('./server').users;
        testUser = users.find(u => u.username === 'premium');
        if (testUser) {
            testUser.aiCredits = 100;
            testUser.subscription = 'basic';
        }
        token = jwt.sign({ id: testUser?.id || 2 }, 'secret');
    });
    
    test('should not award AI credits on premium subscription', async () => {
        const response = await request(app)
            .post('/subscription/upgrade')
            .set('Authorization', `Bearer ${token}`)
            .send({ plan: 'premium' })
            .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.aiCredits).toBe(100);
    });
    
    test('should award 30 AI credits on full subscription', async () => {
        const response = await request(app)
            .post('/subscription/upgrade')
            .set('Authorization', `Bearer ${token}`)
            .send({ plan: 'full' })
            .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.aiCredits).toBe(130);
    });
    
    test('should reject invalid plan', async () => {
        const response = await request(app)
            .post('/subscription/upgrade')
            .set('Authorization', `Bearer ${token}`)
            .send({ plan: 'invalid' })
            .expect(400);
        
        expect(response.body.success).toBe(false);
    });
    
    test('should require authentication', async () => {
        await request(app)
            .post('/subscription/upgrade')
            .send({ plan: 'premium' })
            .expect(401);
    });
});