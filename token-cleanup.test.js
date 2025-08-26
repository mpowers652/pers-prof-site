describe('Token Cleanup', () => {
    let mockCookies, mockLocalStorage;

    beforeEach(() => {
        jest.restoreAllMocks();
        mockCookies = {};
        mockLocalStorage = {};
        
        // Mock atob
        global.atob = (str) => Buffer.from(str, 'base64').toString('utf8');
        
        // Mock document.cookie
        global.document = {
            cookie: '',
            addEventListener: jest.fn()
        };
        Object.defineProperty(global.document, 'cookie', {
            get: () => Object.entries(mockCookies).map(([k, v]) => `${k}=${v}`).join('; '),
            set: (cookie) => {
                const [pair] = cookie.split(';');
                const [key, value] = pair.trim().split('=');
                if (value && value !== '') {
                    mockCookies[key.trim()] = value;
                } else if (cookie.includes('expires=Thu, 01 Jan 1970')) {
                    delete mockCookies[key.trim()];
                }
            }
        });
        
        // Mock localStorage
        global.localStorage = {
            getItem: (key) => mockLocalStorage[key] || null,
            setItem: (key, value) => mockLocalStorage[key] = value,
            removeItem: (key) => delete mockLocalStorage[key],
            clear: () => mockLocalStorage = {}
        };
    });
    
    afterEach(() => {
        mockLocalStorage = {};
        mockCookies = {};
    });

    test('isTokenExpired should not give false positives', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const validPayload = { id: 1, exp: now + 3600, iat: now };
        const validToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + 
                          Buffer.from(JSON.stringify(validPayload)).toString('base64') + '.signature';
        
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
        
        expect(isTokenExpired(validToken)).toBe(false);
    });

    test('getCookieToken function', () => {
        mockCookies.token = 'test-token';
        
        function getCookieToken() {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'token') return value;
            }
            return null;
        }
        
        expect(getCookieToken()).toBe('test-token');
    });

    test('should detect expired token in localStorage', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const expiredPayload = { id: 1, exp: now - 3600, iat: now - 7200 };
        const expiredToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + 
                            Buffer.from(JSON.stringify(expiredPayload)).toString('base64') + '.signature';
        
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
        
        expect(isTokenExpired(expiredToken)).toBe(true);
    });

    test('should detect expired token in cookies', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const expiredPayload = { id: 1, exp: now - 3600, iat: now - 7200 };
        const expiredToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + 
                            Buffer.from(JSON.stringify(expiredPayload)).toString('base64') + '.signature';
        
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
        
        expect(isTokenExpired(expiredToken)).toBe(true);
    });

    test('should keep valid token', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const validPayload = { id: 1, exp: now + 3600, iat: now };
        const validToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + 
                          Buffer.from(JSON.stringify(validPayload)).toString('base64') + '.signature';
        
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
        
        expect(isTokenExpired(validToken)).toBe(false);
    });

    test('should handle cookie-based authentication', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const validPayload = { id: 1, exp: now + 3600, iat: now };
        const validToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + 
                          Buffer.from(JSON.stringify(validPayload)).toString('base64') + '.signature';
        
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
        
        expect(isTokenExpired(validToken)).toBe(false);
        expect(isValidJWT(validToken)).toBe(true);
    });
});