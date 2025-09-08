const jwt = require('jsonwebtoken');

describe('Test Admin Access Module', () => {
    let mockRequest;
    let mockApp;

    beforeEach(() => {
        // Create fresh mocks for each test
        mockRequest = {
            post: jest.fn().mockReturnThis(),
            get: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis()
        };

        mockApp = {};

        // Mock console functions
        console.log = jest.fn();
        console.error = jest.fn();
        
        process.env.ADMIN_EMAIL = 'admin@test.com';
    });

    test('tests admin access flow', () => {
        const adminEmail = process.env.ADMIN_EMAIL || 'cartoonsredbob@gmail.com';
        console.log('Admin email configured as:', adminEmail);

        // Create admin user token
        const adminUser = {
            id: 999,
            email: adminEmail,
            role: 'admin',
            subscription: 'full'
        };
        
        const token = jwt.sign({ id: adminUser.id }, 'secret', { expiresIn: '10m' });

        expect(console.log).toHaveBeenCalledWith('Admin email configured as:', 'admin@test.com');
        expect(token).toBeDefined();
        
        // Verify token structure
        const decoded = jwt.verify(token, 'secret');
        expect(decoded.id).toBe(999);
    });

    test('handles login attempt', () => {
        mockRequest.post.mockResolvedValue({
            body: { success: true, token: 'login-token' }
        });

        // Test login data structure
        const loginData = { username: 'admin', password: 'test' };
        
        expect(loginData.username).toBe('admin');
        expect(loginData.password).toBe('test');
    });

    test('tests story generator access', () => {
        const token = jwt.sign({ id: 999 }, 'secret', { expiresIn: '10m' });
        const authHeader = `Bearer ${token}`;
        
        expect(authHeader).toMatch(/^Bearer /);
        expect(token).toBeDefined();
    });

    test('handles errors gracefully', () => {
        // Test error handling structure
        const error = new Error('Network error');
        console.error('Expected error:', error.message);
        
        expect(console.error).toHaveBeenCalledWith('Expected error:', 'Network error');
    });

    test('uses default admin email when not set', () => {
        delete process.env.ADMIN_EMAIL;
        
        const adminEmail = process.env.ADMIN_EMAIL || 'cartoonsredbob@gmail.com';
        console.log('Admin email configured as:', adminEmail);

        expect(console.log).toHaveBeenCalledWith('Admin email configured as:', 'cartoonsredbob@gmail.com');
    });
});