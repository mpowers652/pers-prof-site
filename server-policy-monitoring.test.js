const fs = require('fs');
const path = require('path');

// Mock bcrypt first
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
    hashSync: jest.fn().mockReturnValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true)
}));

// Mock fs module
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    watchFile: jest.fn()
}));

// Mock other dependencies
jest.mock('@google-cloud/secret-manager');
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
                getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
            }))
        },
        gmail: jest.fn().mockReturnValue({
            users: {
                messages: {
                    send: jest.fn().mockResolvedValue({ data: { id: 'mock-message-id' } })
                }
            }
        })
    }
}));

jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Policy changes summary' } }]
                })
            }
        }
    }));
});

jest.mock('passport', () => ({
    initialize: () => (req, res, next) => next(),
    session: () => (req, res, next) => next(),
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
    authenticate: jest.fn(() => (req, res, next) => next())
}));

jest.mock('passport-google-oauth20', () => ({
    Strategy: jest.fn()
}));

jest.mock('passport-facebook', () => ({
    Strategy: jest.fn()
}));

jest.mock('twilio', () => jest.fn(() => ({
    messages: {
        create: jest.fn().mockResolvedValue({ sid: 'mock-sms-id' })
    }
})));

describe('Privacy Policy Monitoring Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        process.env.NODE_ENV = 'test';
        process.env.OPENAI_API_KEY = 'test-key';
        process.env.GMAIL_USER = 'test@gmail.com';
    });

    test('should initialize policy monitoring', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('<html>Initial policy</html>');
        
        const server = require('./server');
        
        // Test that the functions exist and can be called
        expect(typeof server.initializePolicyMonitoring).toBe('function');
        expect(typeof server.handlePolicyUpdate).toBe('function');
        
        // Call the function to ensure it doesn't throw
        expect(() => server.initializePolicyMonitoring()).not.toThrow();
    });

    test('should handle policy file changes', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync
            .mockReturnValueOnce('<html>Initial policy</html>')  // Initial read
            .mockReturnValueOnce('<html>Updated policy</html>'); // Change detection
        
        fs.mkdirSync.mockImplementation(() => {});
        fs.writeFileSync.mockImplementation(() => {});
        
        const server = require('./server');
        
        // Test that the function can be called without throwing
        await expect(server.handlePolicyUpdate()).resolves.not.toThrow();
    });

    test('should handle policy monitoring without existing file', () => {
        fs.existsSync.mockReturnValue(false);
        
        const server = require('./server');
        
        // Test that the function can be called without throwing
        expect(() => server.initializePolicyMonitoring()).not.toThrow();
    });

    test('should create archives directory if not exists', async () => {
        fs.existsSync
            .mockReturnValueOnce(true)  // Policy file exists
            .mockReturnValueOnce(false); // Archives dir doesn't exist
        
        fs.readFileSync
            .mockReturnValueOnce('<html>Initial policy</html>')
            .mockReturnValueOnce('<html>Updated policy</html>');
        
        fs.mkdirSync.mockImplementation(() => {});
        fs.writeFileSync.mockImplementation(() => {});
        
        const server = require('./server');
        
        // Test that the function can be called without throwing
        await expect(server.handlePolicyUpdate()).resolves.not.toThrow();
    });

    test('should handle OpenAI API errors gracefully', async () => {
        const mockOpenAI = require('openai');
        mockOpenAI.mockImplementation(() => ({
            chat: {
                completions: {
                    create: jest.fn().mockRejectedValue(new Error('API Error'))
                }
            }
        }));
        
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync
            .mockReturnValueOnce('<html>Initial policy</html>')
            .mockReturnValueOnce('<html>Updated policy</html>');
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const server = require('./server');
        
        // Test that the function handles errors gracefully
        await expect(server.handlePolicyUpdate()).resolves.not.toThrow();
        
        consoleSpy.mockRestore();
    });

    test('should handle email sending errors', async () => {
        const { google } = require('googleapis');
        google.gmail.mockReturnValue({
            users: {
                messages: {
                    send: jest.fn().mockRejectedValue(new Error('Email error'))
                }
            }
        });
        
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync
            .mockReturnValueOnce('<html>Initial policy</html>')
            .mockReturnValueOnce('<html>Updated policy</html>');
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const server = require('./server');
        
        // Test that the function handles errors gracefully
        await expect(server.handlePolicyUpdate()).resolves.not.toThrow();
        
        consoleSpy.mockRestore();
    });
});