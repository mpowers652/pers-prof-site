const fs = require('fs');
const https = require('https');

// Mock only what we need for HTTPS testing
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn(),
    existsSync: jest.fn()
}));

jest.mock('https', () => ({
    createServer: jest.fn()
}));

// Mock environment variables that might cause issues
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';

describe('Server HTTPS Startup Tests', () => {
    let mockServer;
    let mockApp;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockServer = {
            listen: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis()
        };
        
        mockApp = {
            listen: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis()
        };
    });

    // Test the HTTPS startup logic directly
    function testStartServer(port) {
        try {
            const options = {
                key: fs.readFileSync('server.key'),
                cert: fs.readFileSync('server.cert')
            };
            const server = https.createServer(options, mockApp);
            server.listen(port, () => {
                console.log(`HTTPS Server running on https://localhost:${port}`);
            }).on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${port} in use, trying ${port + 1}`);
                    testStartServer(port + 1);
                }
            });
            return server;
        } catch (error) {
            console.log('HTTPS certificates not found, starting HTTP server');
            const server = mockApp.listen(port, () => {
                console.log(`HTTP Server running on http://localhost:${port}`);
            }).on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${port} in use, trying ${port + 1}`);
                    testStartServer(port + 1);
                }
            });
            return server;
        }
    }

    test('should start HTTPS server when certificates exist', (done) => {
        fs.readFileSync.mockReturnValue('mock-cert-content');
        https.createServer.mockReturnValue(mockServer);
        
        mockServer.listen.mockImplementation((port, callback) => {
            if (callback) callback();
            return mockServer;
        });

        testStartServer(3000);
        
        setTimeout(() => {
            expect(https.createServer).toHaveBeenCalled();
            expect(mockServer.listen).toHaveBeenCalledWith(3000, expect.any(Function));
            done();
        }, 50);
    });

    test('should fallback to HTTP when certificates missing', (done) => {
        fs.readFileSync.mockImplementation(() => {
            throw new Error('Certificate not found');
        });
        
        mockApp.listen.mockImplementation((port, callback) => {
            if (callback) callback();
            return mockApp;
        });

        testStartServer(3001);
        
        setTimeout(() => {
            expect(https.createServer).not.toHaveBeenCalled();
            expect(mockApp.listen).toHaveBeenCalledWith(3001, expect.any(Function));
            done();
        }, 50);
    });

    test('should handle port in use error and retry', (done) => {
        fs.readFileSync.mockReturnValue('mock-cert-content');
        https.createServer.mockReturnValue(mockServer);
        
        let callCount = 0;
        mockServer.listen.mockImplementation((port, callback) => {
            callCount++;
            if (callCount === 1) {
                // First call fails - trigger error event
                setTimeout(() => {
                    const errorCallback = mockServer.on.mock.calls.find(call => call[0] === 'error')?.[1];
                    if (errorCallback) {
                        errorCallback({ code: 'EADDRINUSE' });
                    }
                }, 10);
                return mockServer;
            } else {
                // Second call succeeds
                if (callback) callback();
                return mockServer;
            }
        });
        
        testStartServer(3002);
        
        setTimeout(() => {
            expect(mockServer.listen).toHaveBeenCalledTimes(2);
            expect(mockServer.listen).toHaveBeenCalledWith(3002, expect.any(Function));
            expect(mockServer.listen).toHaveBeenCalledWith(3003, expect.any(Function));
            done();
        }, 100);
    });

    test('should create HTTPS server with correct options', () => {
        const mockCertContent = 'mock-cert-content';
        const mockKeyContent = 'mock-key-content';
        
        fs.readFileSync.mockImplementation((filename) => {
            if (filename === 'server.cert') return mockCertContent;
            if (filename === 'server.key') return mockKeyContent;
            throw new Error('File not found');
        });
        
        https.createServer.mockReturnValue(mockServer);
        
        testStartServer(3003);
        
        expect(https.createServer).toHaveBeenCalledWith({
            key: mockKeyContent,
            cert: mockCertContent
        }, mockApp);
    });
});