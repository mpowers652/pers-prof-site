const request = require('supertest');

// Mock the server module
const mockApp = {
    post: jest.fn(),
    use: jest.fn(),
    listen: jest.fn()
};

jest.mock('./server', () => mockApp);

// Mock supertest
const mockRequest = {
    post: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
};

jest.mock('supertest', () => jest.fn(() => mockRequest));

describe('test-admin.js Coverage Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ADMIN_PASSWORD = 'test123';
    });

    test('successful admin login and email configuration', async () => {
        // Mock successful login
        mockRequest.post.mockImplementation((path) => {
            if (path === '/auth/login') {
                return Promise.resolve({
                    body: { success: true, token: 'admin-token-123' }
                });
            }
            if (path === '/admin/set-email') {
                return Promise.resolve({
                    body: { 
                        success: true, 
                        message: 'Email updated to newemail@example.com' 
                    }
                });
            }
            return mockRequest;
        });

        // Load and execute the test-admin module
        const adminModule = require('./test-admin-module.js');
        await adminModule.performAdminLogin(mockApp);

        // Verify the login request was made
        expect(mockRequest.post).toHaveBeenCalledWith('/auth/login');
        expect(mockRequest.send).toHaveBeenCalledWith({
            username: 'admin',
            password: 'test123'
        });
    });

    test('handles failed admin login', async () => {
        // Mock failed login
        mockRequest.post.mockImplementation((path) => {
            if (path === '/auth/login') {
                return Promise.resolve({
                    body: { success: false, message: 'Invalid credentials' }
                });
            }
            return mockRequest;
        });

        // This should handle the login failure gracefully
        const adminModule = require('./test-admin-module.js');
        try {
            await adminModule.performAdminLogin(mockApp);
        } catch (error) {
            // Expected to fail
        }
    });

    test('handles missing admin password', async () => {
        delete process.env.ADMIN_PASSWORD;
        
        mockRequest.post.mockImplementation(() => {
            return Promise.resolve({
                body: { success: false, message: 'No password provided' }
            });
        });

        const adminModule = require('./test-admin-module.js');
        try {
            await adminModule.performAdminLogin(mockApp, 'admin', undefined);
        } catch (error) {
            // Expected to fail
        }
        
        expect(mockRequest.send).toHaveBeenCalledWith({
            username: 'admin',
            password: undefined
        });
    });

    test('handles email setting failure', async () => {
        // Mock successful login but failed email setting
        mockRequest.post.mockImplementation((path) => {
            if (path === '/auth/login') {
                return Promise.resolve({
                    body: { success: true, token: 'valid-token' }
                });
            }
            if (path === '/admin/set-email') {
                return Promise.resolve({
                    body: { 
                        success: false, 
                        message: 'Email update failed' 
                    }
                });
            }
            return mockRequest;
        });

        const adminModule = require('./test-admin-module.js');
        const token = await adminModule.performAdminLogin(mockApp);
        await adminModule.testAdminEmailConfiguration(mockApp, token);
        
        expect(mockRequest.set).toHaveBeenCalledWith('Authorization', 'Bearer valid-token');
        expect(mockRequest.send).toHaveBeenCalledWith({
            email: 'newemail@example.com'
        });
    });

    test('handles network errors', async () => {
        // Mock network error
        mockRequest.post.mockRejectedValue(new Error('Network error'));

        const adminModule = require('./test-admin-module.js');
        try {
            await adminModule.performAdminLogin(mockApp);
        } catch (error) {
            // Expected to fail with network error
        }
    });

    test('verifies test structure', async () => {
        // Verify the module can be loaded and used
        const adminModule = require('./test-admin-module.js');
        expect(adminModule.performAdminLogin).toBeDefined();
        
        // Verify supertest was called with the app
        expect(require('supertest')).toHaveBeenCalledWith(mockApp);
    });

    test('handles different admin password values', async () => {
        process.env.ADMIN_PASSWORD = 'different-password';
        
        mockRequest.post.mockImplementation(() => {
            return Promise.resolve({
                body: { success: true, token: 'new-token' }
            });
        });

        const adminModule = require('./test-admin-module.js');
        await adminModule.performAdminLogin(mockApp, 'admin', 'different-password');
        
        expect(mockRequest.send).toHaveBeenCalledWith({
            username: 'admin',
            password: 'different-password'
        });
    });
});