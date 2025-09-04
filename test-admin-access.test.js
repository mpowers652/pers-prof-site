// Mock dependencies
const mockRequest = {
    post: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
};

const mockJwt = {
    sign: jest.fn()
};

jest.mock('supertest', () => jest.fn(() => mockRequest));
jest.mock('./server', () => ({}));
jest.mock('jsonwebtoken', () => mockJwt);

describe('Test Admin Access Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();
        
        process.env.ADMIN_EMAIL = 'admin@test.com';
        
        // Reset module
        jest.resetModules();
    });

    test('tests admin access flow', async () => {
        mockRequest.post.mockResolvedValue({
            body: { success: false, message: 'Invalid credentials' }
        });

        mockRequest.get.mockResolvedValue({
            status: 200,
            text: '<html>Story Generator Page</html>'
        });

        mockJwt.sign.mockReturnValue('mock-admin-token');

        // Import and run the test
        const adminModule = require('./test-admin-access-module.js');
        await adminModule.testAdminAccess({});

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(console.log).toHaveBeenCalledWith('Admin email configured as:', 'admin@test.com');
        expect(mockJwt.sign).toHaveBeenCalledWith(
            { id: 999 },
            'secret',
            { expiresIn: '10m' }
        );
    });

    test('handles login attempt', async () => {
        mockRequest.post.mockResolvedValue({
            body: { success: true, token: 'login-token' }
        });

        mockRequest.get.mockResolvedValue({
            status: 403,
            text: 'Access denied'
        });

        mockJwt.sign.mockReturnValue('admin-token');

        const adminModule = require('./test-admin-access-module.js');
        await adminModule.testAdminAccess({});

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockRequest.post).toHaveBeenCalledWith('/auth/login');
        expect(mockRequest.send).toHaveBeenCalledWith({
            username: 'admin',
            password: 'test'
        });
    });

    test('tests story generator access', async () => {
        mockRequest.post.mockResolvedValue({
            body: { success: false }
        });

        mockRequest.get.mockResolvedValue({
            status: 200,
            text: 'Story generator content here...'
        });

        mockJwt.sign.mockReturnValue('test-token');

        const adminModule = require('./test-admin-access-module.js');
        await adminModule.testAdminAccess({});

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockRequest.get).toHaveBeenCalledWith('/story-generator');
        expect(mockRequest.set).toHaveBeenCalledWith('Authorization', 'Bearer test-token');
    });

    test('handles errors gracefully', async () => {
        mockRequest.post.mockRejectedValue(new Error('Network error'));
        mockJwt.sign.mockReturnValue('error-token');

        const adminModule = require('./test-admin-access-module.js');
        try {
            await adminModule.testAdminAccess({});
        } catch (error) {
            // Expected to fail
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(console.error).toHaveBeenCalled();
    });

    test('uses default admin email when not set', async () => {
        delete process.env.ADMIN_EMAIL;
        
        mockRequest.post.mockResolvedValue({ body: {} });
        mockRequest.get.mockResolvedValue({ status: 200, text: '' });
        mockJwt.sign.mockReturnValue('default-token');

        const adminModule = require('./test-admin-access-module.js');
        await adminModule.testAdminAccess({});

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(console.log).toHaveBeenCalledWith('Admin email configured as:', 'cartoonsredbob@gmail.com');
    });
});