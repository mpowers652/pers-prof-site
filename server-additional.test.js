const request = require('supertest');

// Mock dependencies
jest.mock('express-session', () => {
    return jest.fn(() => (req, res, next) => next());
});
jest.mock('passport', () => ({
    initialize: () => (req, res, next) => next(),
    session: () => (req, res, next) => next(),
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
    authenticate: jest.fn(() => (req, res, next) => next())
}));
jest.mock('googleapis');
jest.mock('openai');
jest.mock('twilio');
jest.mock('nodemailer');
jest.mock('@google-cloud/secret-manager', () => ({
    SecretManagerServiceClient: jest.fn(() => ({
        accessSecretVersion: jest.fn().mockRejectedValue(new Error('Secret not found'))
    }))
}));

describe('Server Additional Coverage', () => {
    let app;

    beforeEach(() => {
        // Reset modules and environment
        jest.resetModules();
        process.env.NODE_ENV = 'test';
        process.env.PORT = '3001';
        
        // Mock console methods
        console.log = jest.fn();
        console.error = jest.fn();
    });

    test('server starts with environment variables', () => {
        process.env.GOOGLE_CLIENT_ID = 'test-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
        process.env.SESSION_SECRET = 'test-session-secret';
        
        expect(() => {
            app = require('./server.js');
        }).not.toThrow();
        
        expect(app).toBeDefined();
    });

    test('server handles missing environment variables', () => {
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;
        delete process.env.SESSION_SECRET;
        
        expect(() => {
            app = require('./server.js');
        }).not.toThrow();
    });

    test('server exports app object', () => {
        app = require('./server.js');
        expect(typeof app).toBe('function');
        expect(app.listen).toBeDefined();
    });

    test('server handles basic routes', async () => {
        app = require('./server.js');
        
        const response = await request(app)
            .get('/health')
            .expect(302); // Server redirects non-existent routes
            
        expect(response).toBeDefined();
    });

    test('server middleware setup', () => {
        app = require('./server.js');
        expect(app._router).toBeDefined();
    });
});