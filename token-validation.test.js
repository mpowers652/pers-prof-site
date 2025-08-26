describe('Token Validation', () => {
    // Mock atob for Node.js environment
    global.atob = (str) => Buffer.from(str, 'base64').toString('utf8');

    function isTokenExpired(token) {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            return now >= payload.exp || (payload.iat && now < payload.iat);
        } catch (e) {
            return true;
        }
    }

    function isValidJWT(token) {
        if (!token || typeof token !== 'string') return false;
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
            JSON.parse(atob(parts[0]));
            JSON.parse(atob(parts[1]));
            return true;
        } catch {
            return false;
        }
    }

    test('should validate valid token correctly', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const validPayload = { id: 1, exp: now + 3600, iat: now };
        const validToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + 
                          Buffer.from(JSON.stringify(validPayload)).toString('base64') + '.signature';
        
        expect(isTokenExpired(validToken)).toBe(false);
        expect(isValidJWT(validToken)).toBe(true);
    });

    test('should detect expired token', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const expiredPayload = { id: 1, exp: now - 3600, iat: now - 7200 };
        const expiredToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + 
                            Buffer.from(JSON.stringify(expiredPayload)).toString('base64') + '.signature';
        
        expect(isTokenExpired(expiredToken)).toBe(true);
        expect(isValidJWT(expiredToken)).toBe(true); // Still valid JWT format
    });

    test('should detect future-dated token', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const futurePayload = { id: 1, exp: now + 3600, iat: now + 1800 }; // iat in future
        const futureToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + 
                           Buffer.from(JSON.stringify(futurePayload)).toString('base64') + '.signature';
        
        expect(isTokenExpired(futureToken)).toBe(true);
        expect(isValidJWT(futureToken)).toBe(true);
    });

    test('should handle invalid token format', () => {
        expect(isTokenExpired('invalid')).toBe(true);
        expect(isValidJWT('invalid')).toBe(false);
        expect(isTokenExpired(null)).toBe(true);
        expect(isValidJWT(null)).toBe(false);
    });
});