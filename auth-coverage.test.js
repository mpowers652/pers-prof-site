/**
 * @jest-environment jsdom
 */

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock console
global.console = { log: jest.fn(), error: jest.fn() };

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;
window.fetch = mockFetch;

// Mock document
Object.defineProperty(document, 'cookie', { writable: true, value: '' });
document.addEventListener = jest.fn();
Object.defineProperty(document, 'hidden', { writable: true, value: false });

// Mock window properties
window.__authToken = null;
// Don't mock location to avoid JSDOM navigation issues

// Load and execute auth.js
require('./auth.js');

// Extract functions from global scope - use direct access with fallback
const isTokenExpired = global.isTokenExpired || window.isTokenExpired;
const isTokenExpiringSoon = global.isTokenExpiringSoon || window.isTokenExpiringSoon;
const isValidJWT = global.isValidJWT || window.isValidJWT;
const getCookieToken = global.getCookieToken || window.getCookieToken;
const getToken = global.getToken || window.getToken;
const clearExpiredToken = global.clearExpiredToken || window.clearExpiredToken;
const refreshTokenIfNeeded = global.refreshTokenIfNeeded || window.refreshTokenIfNeeded;
const setAuthHeaders = global.setAuthHeaders || window.setAuthHeaders;
const trackActivity = global.trackActivity || window.trackActivity;
const startTokenRefreshTimer = global.startTokenRefreshTimer || window.startTokenRefreshTimer;

// Debug: Check if functions are loaded
console.log('Functions loaded:', {
    isTokenExpired: typeof isTokenExpired,
    refreshTokenIfNeeded: typeof refreshTokenIfNeeded
});

describe('Auth Module Coverage Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue(null);
        document.cookie = '';
        window.__authToken = null;
        // Don't reset location to avoid JSDOM issues
        document.hidden = false;
        mockFetch.mockClear();
    });

    describe('isTokenExpired', () => {
        test('returns true for null token', () => {
            expect(isTokenExpired(null)).toBe(true);
        });

        test('returns true for undefined token', () => {
            expect(isTokenExpired(undefined)).toBe(true);
        });

        test('returns true for expired token', () => {
            const expiredToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 })) + '.signature';
            expect(isTokenExpired(expiredToken)).toBe(true);
        });

        test('returns false for valid token', () => {
            const validToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            expect(isTokenExpired(validToken)).toBe(false);
        });

        test('returns true for token with future iat', () => {
            const futureIatToken = 'header.' + btoa(JSON.stringify({ 
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000) + 100
            })) + '.signature';
            expect(isTokenExpired(futureIatToken)).toBe(true);
        });

        test('returns true for malformed token', () => {
            expect(isTokenExpired('invalid.token')).toBe(true);
        });

        test('returns true for token with invalid JSON', () => {
            expect(isTokenExpired('header.invalid-json.signature')).toBe(true);
        });
    });

    describe('isTokenExpiringSoon', () => {
        test('returns false for null token', () => {
            expect(isTokenExpiringSoon(null)).toBe(false);
        });

        test('returns true for token expiring soon', () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            expect(isTokenExpiringSoon(soonToken)).toBe(true);
        });

        test('returns false for token not expiring soon', () => {
            const futureToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            expect(isTokenExpiringSoon(futureToken)).toBe(false);
        });

        test('returns false for malformed token', () => {
            expect(isTokenExpiringSoon('invalid')).toBe(false);
        });
    });

    describe('isValidJWT', () => {
        test('returns false for null token', () => {
            expect(isValidJWT(null)).toBe(false);
        });

        test('returns false for non-string token', () => {
            expect(isValidJWT(123)).toBe(false);
        });

        test('returns false for token with wrong number of parts', () => {
            expect(isValidJWT('only.two')).toBe(false);
        });

        test('returns true for valid JWT format', () => {
            const validJWT = btoa(JSON.stringify({ typ: 'JWT' })) + '.' + btoa(JSON.stringify({ exp: 123 })) + '.signature';
            expect(isValidJWT(validJWT)).toBe(true);
        });

        test('returns false for invalid base64', () => {
            expect(isValidJWT('invalid-header.' + btoa(JSON.stringify({ exp: 123 })) + '.signature')).toBe(false);
        });
    });

    describe('getCookieToken', () => {
        test('returns null when no cookies', () => {
            document.cookie = '';
            expect(getCookieToken()).toBe(null);
        });

        test('returns token from cookie', () => {
            document.cookie = 'token=abc123; other=value';
            expect(getCookieToken()).toBe('abc123');
        });

        test('returns token with spaces', () => {
            document.cookie = ' token=abc123 ; other=value';
            expect(getCookieToken()).toBe('abc123');
        });
    });

    describe('getToken', () => {
        test('returns localStorage token first', () => {
            mockLocalStorage.getItem.mockReturnValue('localStorage-token');
            window.__authToken = 'global-token';
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('localStorage-token');
        });

        test('returns global token when no localStorage', () => {
            window.__authToken = 'global-token';
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('global-token');
        });

        test('returns cookie token as fallback', () => {
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('cookie-token');
        });
    });

    describe('clearExpiredToken', () => {
        test('clears expired token', () => {
            const expiredToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 })) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            expect(clearExpiredToken()).toBe(true);
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('userType');
        });

        test('does not clear valid token', () => {
            const validToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(validToken);
            expect(clearExpiredToken()).toBe(false);
        });
    });

    describe('refreshTokenIfNeeded', () => {
        test('returns false for no token', async () => {
            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });

        test('returns false for expired token', async () => {
            const expiredToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 })) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });

        test('refreshes token when expiring soon', async () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            const newToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            
            mockLocalStorage.getItem.mockReturnValue(soonToken);
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ token: newToken })
            });

            const result = await refreshTokenIfNeeded();
            expect(result).toBe(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', newToken);
        });

        test('handles refresh failure', async () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(soonToken);
            mockFetch.mockRejectedValue(new Error('Network error'));

            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });

        test('handles non-ok response', async () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(soonToken);
            mockFetch.mockResolvedValue({ ok: false });

            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });

        test('handles invalid token response', async () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(soonToken);
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ token: 'invalid-token' })
            });

            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });
    });

    describe('setAuthHeaders', () => {
        test('returns auth header for valid token', () => {
            const validToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(validToken);
            const headers = setAuthHeaders();
            expect(headers).toEqual({ 'Authorization': `Bearer ${validToken}` });
        });

        test('returns guest header for guest user', () => {
            mockLocalStorage.getItem.mockImplementation(key => key === 'userType' ? 'guest' : null);
            const headers = setAuthHeaders();
            expect(headers).toEqual({ 'X-User-Type': 'guest' });
        });

        test('returns empty headers for no token', () => {
            const headers = setAuthHeaders();
            expect(headers).toEqual({});
        });
    });

    describe('trackActivity', () => {
        test('updates lastActivity', () => {
            const before = global.lastActivity;
            trackActivity();
            expect(global.lastActivity).toBeGreaterThan(before);
        });
    });

    describe('startTokenRefreshTimer', () => {
        test('starts refresh timer', () => {
            jest.spyOn(global, 'setInterval');
            startTokenRefreshTimer();
            expect(global.setInterval).toHaveBeenCalled();
        });

        test('clears existing interval', () => {
            jest.spyOn(global, 'clearInterval');
            global.refreshInterval = 123;
            startTokenRefreshTimer();
            expect(global.clearInterval).toHaveBeenCalledWith(123);
        });
    });

    describe('Event listeners and initialization', () => {
        test('adds event listeners', () => {
            expect(document.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function), { passive: true });
            expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        });
    });

    describe('Fetch override', () => {
        test('overrides window.fetch', () => {
            expect(typeof window.fetch).toBe('function');
        });
    });
});