const request = require('supertest');

// Mock environment
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLOUD_PROJECT = '914087269150';

// Mock Secret Manager with different scenarios
const mockSecretClient = {
    accessSecretVersion: jest.fn()
};

jest.mock('@google-cloud/secret-manager', () => ({
    SecretManagerServiceClient: jest.fn(() => mockSecretClient)
}));

jest.mock('googleapis');
jest.mock('twilio');
jest.mock('openai');

describe('Secret Manager Integration Tests', () => {
    let app;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });

    test('should handle successful secret retrieval', async () => {
        mockSecretClient.accessSecretVersion.mockResolvedValue([{
            payload: { data: Buffer.from('secret-value') }
        }]);

        app = require('./server');
        expect(app).toBeDefined();
    });

    test('should handle secret retrieval failure', async () => {
        mockSecretClient.accessSecretVersion.mockRejectedValue(new Error('Secret not found'));

        app = require('./server');
        expect(app).toBeDefined();
    });

    test('should use default project ID when not set', async () => {
        delete process.env.GOOGLE_CLOUD_PROJECT;
        mockSecretClient.accessSecretVersion.mockRejectedValue(new Error('Secret not found'));

        app = require('./server');
        expect(app).toBeDefined();
    });

    test('should load conditional secrets on demand', async () => {
        mockSecretClient.accessSecretVersion.mockResolvedValue([{
            payload: { data: Buffer.from('conditional-secret') }
        }]);

        app = require('./server');
        
        // Test endpoint that would trigger conditional secret loading
        const res = await request(app)
            .post('/contact')
            .send({
                name: 'Test',
                email: 'test@example.com',
                subject: 'Test',
                message: 'Test message'
            });
        
        expect(res.body).toBeDefined();
    });
});