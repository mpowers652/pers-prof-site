// Mock supertest and server
const mockRequest = {
    post: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
};

const mockApp = {};

jest.mock('supertest', () => jest.fn(() => mockRequest));
jest.mock('./server', () => mockApp);

describe('Test Admin Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ADMIN_PASSWORD = 'test123';
    });

    test('admin email configuration test setup', async () => {
        // Mock successful login response
        mockRequest.post.mockImplementation((path) => {
            if (path === '/auth/login') {
                return Promise.resolve({
                    body: { success: true, token: 'admin-token' }
                });
            }
            if (path === '/admin/set-email') {
                return Promise.resolve({
                    body: { 
                        success: true, 
                        message: 'Email set to newemail@example.com' 
                    }
                });
            }
            return mockRequest;
        });

        const adminModule = require('./test-admin-module.js');
        await adminModule.performAdminLogin(mockApp);

        expect(mockRequest.post).toHaveBeenCalledWith('/auth/login');
        expect(mockRequest.send).toHaveBeenCalledWith({
            username: 'admin',
            password: 'test123'
        });
    });

    test('handles admin login failure', async () => {
        mockRequest.post.mockImplementation(() => {
            return Promise.resolve({
                body: { success: false, message: 'Invalid credentials' }
            });
        });

        const adminModule = require('./test-admin-module.js');
        try {
            await adminModule.performAdminLogin(mockApp);
        } catch (error) {
            // Expected to fail
        }

        expect(mockRequest.post).toHaveBeenCalled();
    });

    test('handles set email request', async () => {
        mockRequest.post.mockImplementation((path) => {
            if (path === '/auth/login') {
                return Promise.resolve({
                    body: { success: true, token: 'valid-token' }
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
});