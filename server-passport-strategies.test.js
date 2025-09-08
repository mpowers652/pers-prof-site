const request = require('supertest');

// Mock environment for OAuth
process.env.NODE_ENV = 'test';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.FACEBOOK_APP_ID = 'test-facebook-id';
process.env.FACEBOOK_APP_SECRET = 'test-facebook-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';

// Mock passport strategies
const mockGoogleStrategy = jest.fn();
const mockFacebookStrategy = jest.fn();

jest.mock('passport-google-oauth20', () => ({
    Strategy: mockGoogleStrategy
}));

jest.mock('passport-facebook', () => ({
    Strategy: mockFacebookStrategy
}));

jest.mock('passport', () => ({
    initialize: () => (req, res, next) => next(),
    session: () => (req, res, next) => next(),
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
    authenticate: jest.fn((strategy, options) => (req, res, next) => {
        if (strategy === 'google') {
            req.user = { 
                id: 1, 
                googleId: 'google123',
                username: 'Test User',
                email: 'admin@test.com',
                role: 'admin',
                subscription: 'full'
            };
        } else if (strategy === 'facebook') {
            req.user = { 
                id: 2, 
                facebookId: 'facebook123',
                username: 'FB User',
                email: 'user@test.com',
                role: 'user',
                subscription: 'basic'
            };
        }
        next();
    })
}));

jest.mock('googleapis');
jest.mock('@google-cloud/secret-manager');

describe('Passport Strategy Tests', () => {
    let app;

    beforeAll(() => {
        // Clear mocks before loading server
        mockGoogleStrategy.mockClear();
        mockFacebookStrategy.mockClear();
        app = require('./server');
        
        // Manually trigger passport initialization for testing
        const server = require('./server');
        if (server.initializePassport) {
            server.initializePassport();
        }
    });

    test('should initialize Google OAuth strategy', () => {
        // Manually call initializePassport to trigger strategy creation
        const server = require('./server');
        server.initializePassport();
        
        // The strategy should be called during initialization
        expect(mockGoogleStrategy).toHaveBeenCalled();
        
        // Test the strategy callback
        const strategyCall = mockGoogleStrategy.mock.calls[0];
        const strategyCallback = strategyCall[1];
        
        // Test admin user creation
        const mockProfile = {
            id: 'google123',
            displayName: 'Admin User',
            emails: [{ value: 'admin@test.com' }],
            photos: [{ value: 'photo.jpg' }]
        };
        
        const mockDone = jest.fn();
        strategyCallback('access-token', 'refresh-token', mockProfile, mockDone);
        
        expect(mockDone).toHaveBeenCalled();
    });

    test('should initialize Facebook OAuth strategy', () => {
        // Ensure initializePassport is called again to trigger Facebook strategy
        const server = require('./server');
        server.initializePassport();
        
        // The strategy should be called during initialization
        expect(mockFacebookStrategy).toHaveBeenCalled();
        
        // Test the strategy callback
        const strategyCall = mockFacebookStrategy.mock.calls[0];
        const strategyCallback = strategyCall[1];
        
        // Test regular user creation
        const mockProfile = {
            id: 'facebook123',
            displayName: 'Regular User',
            emails: [{ value: 'user@test.com' }],
            photos: [{ value: 'photo.jpg' }]
        };
        
        const mockDone = jest.fn();
        strategyCallback('access-token', 'refresh-token', mockProfile, mockDone);
        
        expect(mockDone).toHaveBeenCalled();
    });

    test('should handle Google OAuth without configured credentials', async () => {
        delete process.env.GMAIL_CLIENT_ID;
        delete process.env.GMAIL_CLIENT_SECRET;
        
        const res = await request(app).get('/auth/google');
        expect(res.status).toBe(500);
        expect(res.text).toContain('Google OAuth not configured');
    });

    test('should handle Facebook OAuth without configured credentials', async () => {
        delete process.env.FACEBOOK_APP_ID;
        delete process.env.FACEBOOK_APP_SECRET;
        
        const res = await request(app).get('/auth/facebook');
        expect(res.status).toBe(500);
        expect(res.text).toContain('Facebook OAuth not configured');
    });

    test('should handle Google OAuth callback success', async () => {
        process.env.GMAIL_CLIENT_ID = 'test-client-id';
        process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
        
        const res = await request(app)
            .get('/auth/google/callback')
            .query({ code: 'auth-code' });
        
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
    });

    test('should handle Facebook OAuth callback success', async () => {
        process.env.FACEBOOK_APP_ID = 'test-facebook-id';
        process.env.FACEBOOK_APP_SECRET = 'test-facebook-secret';
        
        const res = await request(app)
            .get('/auth/facebook/callback')
            .query({ code: 'auth-code' });
        
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
    });
});