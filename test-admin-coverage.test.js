// Mock supertest module with proper chaining
const mockRequest = {
    post: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
};

// Make sure all methods return the mock object for chaining
mockRequest.post.mockReturnValue(mockRequest);
mockRequest.send.mockReturnValue(Promise.resolve({ body: {} }));
mockRequest.set.mockReturnValue(mockRequest);

jest.mock('supertest', () => jest.fn(() => mockRequest));

describe('test-admin.js Coverage Tests', () => {
    let adminModule;
    
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ADMIN_PASSWORD = 'test123';
        
        // Reset mock methods to ensure proper chaining
        mockRequest.post.mockReturnValue(mockRequest);
        mockRequest.set.mockReturnValue(mockRequest);
        mockRequest.send.mockResolvedValue({ body: {} });
        
        // Reset the module cache to get fresh imports
        delete require.cache[require.resolve('./test-admin-module.js')];
        adminModule = require('./test-admin-module.js');
    });

    test('module exports expected functions', () => {
        expect(adminModule.performAdminLogin).toBeDefined();
        expect(adminModule.testAdminEmailConfiguration).toBeDefined();
        expect(adminModule.testPrivacyPolicyDetection).toBeDefined();
    });

    test('performAdminLogin calls correct endpoints', async () => {
        // Mock successful response
        mockRequest.send.mockResolvedValue({
            body: { success: true, token: 'test-token' }
        });

        const mockApp = {};
        const result = await adminModule.performAdminLogin(mockApp, 'admin', 'test123');
        
        expect(mockRequest.post).toHaveBeenCalledWith('/auth/login');
        expect(mockRequest.send).toHaveBeenCalledWith({
            username: 'admin',
            password: 'test123'
        });
        expect(result).toBe('test-token');
    });

    test('testAdminEmailConfiguration sets authorization header', async () => {
        mockRequest.send.mockResolvedValue({
            body: { success: true }
        });

        const mockApp = {};
        const token = 'test-token';
        
        await adminModule.testAdminEmailConfiguration(mockApp, token);
        
        expect(mockRequest.post).toHaveBeenCalledWith('/admin/set-email');
        expect(mockRequest.set).toHaveBeenCalledWith('Authorization', 'Bearer test-token');
        expect(mockRequest.send).toHaveBeenCalledWith({
            email: 'newemail@example.com'
        });
    });

    test('testPrivacyPolicyDetection calls correct endpoint', async () => {
        // For this test, set needs to return a promise since there's no .send() call
        mockRequest.set.mockResolvedValue({
            body: { success: true }
        });

        const mockApp = {};
        const token = 'test-token';
        
        await adminModule.testPrivacyPolicyDetection(mockApp, token);
        
        expect(mockRequest.post).toHaveBeenCalledWith('/privacy-policy/detect-changes');
        expect(mockRequest.set).toHaveBeenCalledWith('Authorization', 'Bearer test-token');
    });

    test('handles missing password parameter', async () => {
        // Clear environment password to test default fallback
        delete process.env.ADMIN_PASSWORD;
        
        mockRequest.send.mockResolvedValue({
            body: { success: false, message: 'Invalid credentials' }
        });

        const mockApp = {};
        const result = await adminModule.performAdminLogin(mockApp, 'admin', undefined);
        
        // When undefined is passed, it should fall back to 'test' default
        expect(mockRequest.send).toHaveBeenCalledWith({
            username: 'admin',
            password: 'test'
        });
        expect(result).toBeUndefined();
    });

    test('uses environment password when not provided', async () => {
        process.env.ADMIN_PASSWORD = 'env-password';
        
        mockRequest.send.mockResolvedValue({
            body: { success: true, token: 'env-token' }
        });

        const mockApp = {};
        const result = await adminModule.performAdminLogin(mockApp);
        
        expect(mockRequest.send).toHaveBeenCalledWith({
            username: 'admin',
            password: 'env-password'
        });
        expect(result).toBe('env-token');
    });
});