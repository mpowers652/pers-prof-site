// Mock jsonwebtoken
const mockJwt = {
    sign: jest.fn(),
    verify: jest.fn()
};

jest.mock('jsonwebtoken', () => mockJwt);

describe('Test Refresh Direct Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();
        
        // Reset module
        jest.resetModules();
    });

    test('generates and tests token', () => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.signature';
        const mockDecoded = { id: 1, iat: 1234567890, exp: 1234571490 };

        mockJwt.sign.mockReturnValue(mockToken);
        mockJwt.verify.mockReturnValue(mockDecoded);

        require('./test-refresh-direct.js');

        expect(mockJwt.sign).toHaveBeenCalledWith(
            { id: 1 },
            'secret',
            { expiresIn: '1h' }
        );

        expect(console.log).toHaveBeenCalledWith('Generated token:', mockToken);

        expect(mockJwt.verify).toHaveBeenCalledWith(
            mockToken,
            'secret',
            { ignoreExpiration: true }
        );

        expect(console.log).toHaveBeenCalledWith('Decoded token:', mockDecoded);
    });

    test('handles token decode error', () => {
        const mockToken = 'invalid-token';
        const mockError = new Error('Invalid token');

        mockJwt.sign.mockReturnValue(mockToken);
        mockJwt.verify.mockImplementation(() => {
            throw mockError;
        });

        require('./test-refresh-direct.js');

        expect(console.log).toHaveBeenCalledWith('Generated token:', mockToken);
        expect(console.error).toHaveBeenCalledWith('Token decode error:', 'Invalid token');
    });

    test('handles jwt sign with different payload', () => {
        const customToken = 'custom.token.here';
        mockJwt.sign.mockReturnValue(customToken);
        mockJwt.verify.mockReturnValue({ id: 1, role: 'user' });

        require('./test-refresh-direct.js');

        expect(mockJwt.sign).toHaveBeenCalledWith(
            { id: 1 },
            'secret',
            { expiresIn: '1h' }
        );
        expect(console.log).toHaveBeenCalledWith('Generated token:', customToken);
    });

    test('handles verification with expired token', () => {
        const expiredToken = 'expired.token.signature';
        mockJwt.sign.mockReturnValue(expiredToken);
        mockJwt.verify.mockReturnValue({ 
            id: 1, 
            iat: 1234567890, 
            exp: 1234567890 // Already expired
        });

        require('./test-refresh-direct.js');

        expect(mockJwt.verify).toHaveBeenCalledWith(
            expiredToken,
            'secret',
            { ignoreExpiration: true }
        );
    });
});