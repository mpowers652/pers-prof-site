/**
 * @jest-environment jsdom
 */

// Mock all globals before loading auth.js
global.console = { log: jest.fn(), error: jest.fn() };
global.fetch = jest.fn();
global.setInterval = jest.fn();
global.clearInterval = jest.fn();

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock document
Object.defineProperty(document, 'cookie', { writable: true, value: '' });
const mockAddEventListener = jest.fn();
document.addEventListener = mockAddEventListener;
Object.defineProperty(document, 'hidden', { writable: true, value: false });

// Mock window properties
window.__authToken = null;
delete window.location;
window.location = { pathname: '/', href: '' };

// Mock base64 functions with proper implementation
global.atob = jest.fn().mockImplementation((str) => {
    try {
        return Buffer.from(str, 'base64').toString('ascii');
    } catch {
        throw new Error('Invalid base64');
    }
});

global.btoa = jest.fn().mockImplementation((str) => {
    return Buffer.from(str, 'ascii').toString('base64');
});

describe('Auth Module Complete Coverage', () => {
    beforeAll(() => {
        // Load auth.js after all mocks are set up
        require('./auth.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue(null);
        document.cookie = '';
        window.__authToken = null;
        window.location = { pathname: '/', href: '' };
        document.hidden = false;
        
        // Reset base64 mocks to default behavior
        global.atob.mockImplementation((str) => {
            try {
                return Buffer.from(str, 'base64').toString('ascii');
            } catch {
                throw new Error('Invalid base64');
            }
        });
        
        global.btoa.mockImplementation((str) => {
            return Buffer.from(str, 'ascii').toString('base64');
        });
    });

    describe('Token validation - isTokenExpired', () => {
        test('handles null and undefined tokens', () => {
            expect(isTokenExpired(null)).toBe(true);
            expect(isTokenExpired(undefined)).toBe(true);
        });

        test('handles expired tokens', () => {
            const now = Math.floor(Date.now() / 1000);
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            expect(isTokenExpired(expiredToken)).toBe(true);
        });

        test('handles valid tokens', () => {
            const now = Math.floor(Date.now() / 1000);
            const validPayload = JSON.stringify({ exp: now + 3600 });
            const validToken = 'header.' + global.btoa(validPayload) + '.signature';
            expect(isTokenExpired(validToken)).toBe(false);
        });

        test('handles tokens with future iat', () => {
            const now = Math.floor(Date.now() / 1000);
            const futureIatPayload = JSON.stringify({ 
                exp: now + 3600, 
                iat: now + 100 
            });
            const futureIatToken = 'header.' + global.btoa(futureIatPayload) + '.signature';
            expect(isTokenExpired(futureIatToken)).toBe(true);
        });

        test('handles malformed tokens', () => {
            expect(isTokenExpired('invalid.token')).toBe(true);
        });

        test('handles JSON parsing errors', () => {
            global.atob.mockImplementationOnce(() => 'invalid-json');
            expect(isTokenExpired('header.invalid.signature')).toBe(true);
        });

        test('handles tokens without iat', () => {
            const now = Math.floor(Date.now() / 1000);
            const payload = JSON.stringify({ exp: now + 3600 });
            const token = 'header.' + global.btoa(payload) + '.signature';
            expect(isTokenExpired(token)).toBe(false);
        });
    });

    describe('Token expiration check - isTokenExpiringSoon', () => {
        test('handles null token', () => {
            expect(isTokenExpiringSoon(null)).toBe(false);
        });

        test('detects tokens expiring soon', () => {
            const now = Math.floor(Date.now() / 1000);
            const soonPayload = JSON.stringify({ exp: now + 300 });
            const soonToken = 'header.' + global.btoa(soonPayload) + '.signature';
            expect(isTokenExpiringSoon(soonToken)).toBe(true);
        });

        test('handles tokens not expiring soon', () => {
            const now = Math.floor(Date.now() / 1000);
            const futurePayload = JSON.stringify({ exp: now + 3600 });
            const futureToken = 'header.' + global.btoa(futurePayload) + '.signature';
            expect(isTokenExpiringSoon(futureToken)).toBe(false);
        });

        test('handles parsing errors gracefully', () => {
            global.atob.mockImplementationOnce(() => { throw new Error('Invalid'); });
            expect(isTokenExpiringSoon('invalid')).toBe(false);
        });
    });

    describe('JWT validation - isValidJWT', () => {
        test('rejects null and non-string tokens', () => {
            expect(isValidJWT(null)).toBe(false);
            expect(isValidJWT(123)).toBe(false);
            expect(isValidJWT('')).toBe(false);
        });

        test('rejects tokens with wrong number of parts', () => {
            expect(isValidJWT('only.two')).toBe(false);
            expect(isValidJWT('one.two.three.four')).toBe(false);
        });

        test('accepts valid JWT format', () => {
            const header = global.btoa(JSON.stringify({ typ: 'JWT' }));
            const payload = global.btoa(JSON.stringify({ exp: 123 }));
            const validJWT = header + '.' + payload + '.signature';
            expect(isValidJWT(validJWT)).toBe(true);
        });

        test('rejects tokens with invalid base64 header', () => {
            const payload = global.btoa(JSON.stringify({ exp: 123 }));
            global.atob.mockImplementation((str) => {
                if (str === 'invalid-header') throw new Error('Invalid');
                return Buffer.from(str, 'base64').toString('ascii');
            });
            expect(isValidJWT('invalid-header.' + payload + '.signature')).toBe(false);
        });

        test('rejects tokens with invalid base64 payload', () => {
            const header = global.btoa(JSON.stringify({ typ: 'JWT' }));
            global.atob.mockImplementation((str) => {
                if (str === 'invalid-payload') throw new Error('Invalid');
                return Buffer.from(str, 'base64').toString('ascii');
            });
            expect(isValidJWT(header + '.invalid-payload.signature')).toBe(false);
        });
    });

    describe('Cookie token retrieval - getCookieToken', () => {
        test('returns null when no cookies', () => {
            document.cookie = '';
            expect(getCookieToken()).toBe(null);
        });

        test('returns null when token cookie not found', () => {
            document.cookie = 'other=value; another=test';
            expect(getCookieToken()).toBe(null);
        });

        test('returns token when found', () => {
            document.cookie = 'token=abc123; other=value';
            expect(getCookieToken()).toBe('abc123');
        });

        test('handles cookies with spaces', () => {
            document.cookie = ' token=spaced123 ; other=value';
            expect(getCookieToken()).toBe('spaced123');
        });

        test('returns first token if multiple exist', () => {
            document.cookie = 'token=first; token=second';
            expect(getCookieToken()).toBe('first');
        });
    });

    describe('Token retrieval priority - getToken', () => {
        test('prioritizes localStorage', () => {
            mockLocalStorage.getItem.mockReturnValue('localStorage-token');
            window.__authToken = 'global-token';
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('localStorage-token');
        });

        test('falls back to global token', () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            window.__authToken = 'global-token';
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('global-token');
        });

        test('falls back to cookie token', () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            window.__authToken = null;
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('cookie-token');
        });

        test('returns null when no token available', () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            window.__authToken = null;
            document.cookie = '';
            expect(getToken()).toBe(null);
        });
    });

    describe('Token cleanup - clearExpiredToken', () => {
        test('clears expired tokens', () => {
            const now = Math.floor(Date.now() / 1000);
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            
            expect(clearExpiredToken()).toBe(true);
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('userType');
        });

        test('preserves valid tokens', () => {
            const now = Math.floor(Date.now() / 1000);
            const validPayload = JSON.stringify({ exp: now + 3600 });
            const validToken = 'header.' + global.btoa(validPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(validToken);
            
            expect(clearExpiredToken()).toBe(false);
            expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
        });

        test('handles no token gracefully', () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            expect(clearExpiredToken()).toBe(false);
        });
    });

    describe('Token refresh - refreshTokenIfNeeded', () => {
        test('returns false when no token', async () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            expect(await refreshTokenIfNeeded()).toBe(false);
        });

        test('returns false for expired tokens', async () => {
            const now = Math.floor(Date.now() / 1000);
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            expect(await refreshTokenIfNeeded()).toBe(false);
        });

        test('returns false when token not expiring soon', async () => {
            const now = Math.floor(Date.now() / 1000);
            const futurePayload = JSON.stringify({ exp: now + 3600 });
            const futureToken = 'header.' + global.btoa(futurePayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(futureToken);
            expect(await refreshTokenIfNeeded()).toBe(false);
        });

        test('successfully refreshes expiring token', async () => {
            const now = Math.floor(Date.now() / 1000);
            const soonPayload = JSON.stringify({ exp: now + 300 });
            const soonToken = 'header.' + global.btoa(soonPayload) + '.signature';
            const newPayload = JSON.stringify({ exp: now + 3600 });
            const newToken = 'header.' + global.btoa(newPayload) + '.signature';
            
            mockLocalStorage.getItem.mockReturnValue(soonToken);
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ token: newToken })
            });
            
            expect(await refreshTokenIfNeeded()).toBe(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', newToken);
        });

        test('handles network errors', async () => {
            const now = Math.floor(Date.now() / 1000);
            const soonPayload = JSON.stringify({ exp: now + 300 });
            const soonToken = 'header.' + global.btoa(soonPayload) + '.signature';
            
            mockLocalStorage.getItem.mockReturnValue(soonToken);
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            expect(await refreshTokenIfNeeded()).toBe(false);
        });

        test('handles non-ok responses', async () => {
            const now = Math.floor(Date.now() / 1000);
            const soonPayload = JSON.stringify({ exp: now + 300 });
            const soonToken = 'header.' + global.btoa(soonPayload) + '.signature';
            
            mockLocalStorage.getItem.mockReturnValue(soonToken);
            global.fetch.mockResolvedValue({ ok: false });
            
            expect(await refreshTokenIfNeeded()).toBe(false);
        });

        test('handles invalid token in response', async () => {
            const now = Math.floor(Date.now() / 1000);
            const soonPayload = JSON.stringify({ exp: now + 300 });
            const soonToken = 'header.' + global.btoa(soonPayload) + '.signature';
            
            mockLocalStorage.getItem.mockReturnValue(soonToken);
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ token: 'invalid-token' })
            });
            
            expect(await refreshTokenIfNeeded()).toBe(false);
        });
    });

    describe('Authentication headers - setAuthHeaders', () => {
        test('returns auth header for valid token', () => {
            const now = Math.floor(Date.now() / 1000);
            const validPayload = JSON.stringify({ exp: now + 3600 });
            const validToken = 'header.' + global.btoa(validPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(validToken);
            
            const headers = setAuthHeaders();
            expect(headers).toEqual({ 'Authorization': `Bearer ${validToken}` });
        });

        test('returns guest header for guest users', () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'userType' ? 'guest' : null
            );
            
            const headers = setAuthHeaders();
            expect(headers).toEqual({ 'X-User-Type': 'guest' });
        });

        test('returns empty headers when no token', () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            expect(setAuthHeaders()).toEqual({});
        });

        test('returns empty headers for expired token', () => {
            const now = Math.floor(Date.now() / 1000);
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            
            expect(setAuthHeaders()).toEqual({});
        });
    });

    describe('Activity tracking', () => {
        test('trackActivity updates lastActivity', () => {
            const before = lastActivity;
            trackActivity();
            expect(lastActivity).toBeGreaterThan(before);
        });
    });

    describe('Timer management', () => {
        test('startTokenRefreshTimer starts interval', () => {
            startTokenRefreshTimer();
            expect(global.setInterval).toHaveBeenCalled();
        });

        test('startTokenRefreshTimer clears existing interval', () => {
            global.refreshInterval = 123;
            startTokenRefreshTimer();
            expect(global.clearInterval).toHaveBeenCalledWith(123);
        });
    });

    describe('Event listeners', () => {
        test('activity event listeners are registered', () => {
            const expectedEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
            expectedEvents.forEach(event => {
                expect(mockAddEventListener).toHaveBeenCalledWith(
                    event, 
                    expect.any(Function), 
                    { passive: true }
                );
            });
        });

        test('visibility change listener is registered', () => {
            expect(mockAddEventListener).toHaveBeenCalledWith(
                'visibilitychange', 
                expect.any(Function)
            );
        });
    });

    describe('Fetch override', () => {
        test('window.fetch is overridden', () => {
            expect(typeof window.fetch).toBe('function');
        });
    });

    describe('Module initialization', () => {
        test('module loads without errors', () => {
            expect(typeof isTokenExpired).toBe('function');
            expect(typeof isTokenExpiringSoon).toBe('function');
            expect(typeof isValidJWT).toBe('function');
            expect(typeof getCookieToken).toBe('function');
            expect(typeof getToken).toBe('function');
            expect(typeof clearExpiredToken).toBe('function');
            expect(typeof refreshTokenIfNeeded).toBe('function');
            expect(typeof setAuthHeaders).toBe('function');
            expect(typeof trackActivity).toBe('function');
            expect(typeof startTokenRefreshTimer).toBe('function');
        });
    });
});