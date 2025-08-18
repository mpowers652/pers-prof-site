const request = require('supertest');
const app = require('./server');

describe('Math Calculator History', () => {
    test('should maintain calculation history in DOM', async () => {
        const response = await request(app).get('/math');
        expect(response.status).toBe(200);
        expect(response.text).toContain('id="history-log"');
        expect(response.text).toContain('Calculation History');
        expect(response.text).toContain('calculationHistory');
        expect(response.text).toContain('updateHistory()');
    });
});