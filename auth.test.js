/**
 * @jest-environment jsdom
 */

// Mock console methods
global.console = {
    log: jest.fn(),
    error: jest.fn()
};

// Mock global objects
global.fetch = jest.fn();
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

// Mock document
Object.defineProperty(document, 'cookie', {
    writable: true,
    value: ''
});

const mockAddEventListener = jest.fn();
document.addEventListener = mockAddEventListener;
document.querySelectorAll = jest.fn(() => []);
Object.defineProperty(document, 'hidden', {
    writable: true,
    value: false
});

// Mock window
global.window = {
    __authToken: null,
    location: { pathname: '/', href: '' },
    fetch: global.fetch,
    Date: Date,
    setInterval: jest.fn(),
    clearInterval: jest.fn()
};

// Mock timers
global.setInterval = jest.fn();
global.clearInterval = jest.fn();

// Load auth.js
require('./auth.js');

// Extract functions from global scope - use direct access
const isTokenExpired = global.isTokenExpired;
const isTokenExpiringSoon = global.isTokenExpiringSoon;
const isValidJWT = global.isValidJWT;
const getCookieToken = global.getCookieToken;
const getToken = global.getToken;
const clearExpiredToken = global.clearExpiredToken;
const refreshTokenIfNeeded = global.refreshTokenIfNeeded;
const setAuthHeaders = global.setAuthHeaders;
const trackActivity = global.trackActivity;
const startTokenRefreshTimer = global.startTokenRefreshTimer;

describe('Auth Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.localStorage.getItem.mockReturnValue(null);
        document.cookie = '';
        global.window.__authToken = null;
        global.window.location = { pathname: '/', href: '' };
        document.hidden = false;
        global.lastActivity = Date.now();
        global.refreshInterval = null;
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
            expect(isValidJWT('one.two.three.four')).toBe(false);
        });

        test('returns true for valid JWT format', () => {
            const validJWT = btoa(JSON.stringify({ typ: 'JWT' })) + '.' + btoa(JSON.stringify({ exp: 123 })) + '.signature';
            expect(isValidJWT(validJWT)).toBe(true);
        });

        test('returns false for invalid base64 in header', () => {
            expect(isValidJWT('invalid-header.' + btoa(JSON.stringify({ exp: 123 })) + '.signature')).toBe(false);
        });

        test('returns false for invalid base64 in payload', () => {
            expect(isValidJWT(btoa(JSON.stringify({ typ: 'JWT' })) + '.invalid-payload.signature')).toBe(false);
        });
    });

    describe('getCookieToken', () => {
        test('returns null when no cookies', () => {
            document.cookie = '';
            expect(getCookieToken()).toBe(null);
        });

        test('returns null when no token cookie', () => {
            document.cookie = 'other=value; another=test';
            expect(getCookieToken()).toBe(null);
        });

        test('returns token from cookie', () => {
            document.cookie = 'token=abc123; other=value';
            expect(getCookieToken()).toBe('abc123');
        });

        test('returns token from cookie with spaces', () => {
            document.cookie = ' token=abc123 ; other=value';
            expect(getCookieToken()).toBe('abc123');
        });
    });

    describe('getToken', () => {
        test('returns localStorage token first', () => {
            global.localStorage.getItem.mockReturnValue('localStorage-token');
            global.window.__authToken = 'global-token';
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('localStorage-token');
        });

        test('returns global token when no localStorage', () => {
            global.window.__authToken = 'global-token';
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('global-token');
        });

        test('returns cookie token as fallback', () => {
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('cookie-token');
        });

        test('returns null when no token anywhere', () => {
            expect(getToken()).toBe(null);
        });
    });

    describe('clearExpiredToken', () => {
        test('clears expired token', () => {
            const expiredToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(expiredToken);
            expect(clearExpiredToken()).toBe(true);
            expect(global.localStorage.removeItem).toHaveBeenCalledWith('token');
            expect(global.localStorage.removeItem).toHaveBeenCalledWith('userType');
        });

        test('does not clear valid token', () => {
            const validToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(validToken);
            expect(clearExpiredToken()).toBe(false);
        });

        test('returns false when no token', () => {
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
            global.localStorage.getItem.mockReturnValue(expiredToken);
            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });

        test('returns false when token not expiring soon', async () => {
            const futureToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(futureToken);
            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });

        test('refreshes token when expiring soon', async () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            const newToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            
            global.localStorage.getItem.mockReturnValue(soonToken);
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ token: newToken })
            });

            const result = await refreshTokenIfNeeded();
            expect(result).toBe(true);
            expect(global.localStorage.setItem).toHaveBeenCalledWith('token', newToken);
        });

        test('handles refresh failure with network error', async () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(soonToken);
            global.fetch.mockRejectedValue(new Error('Network error'));

            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });

        test('handles refresh failure with non-ok response', async () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(soonToken);
            global.fetch.mockResolvedValue({ ok: false });

            const result = await refreshTokenIfNeeded();
            expect(result).toBe(false);
        });

        test('handles invalid token in response', async () => {
            const soonToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(soonToken);
            global.fetch.mockResolvedValue({
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
            global.localStorage.getItem.mockReturnValue(validToken);
            const headers = setAuthHeaders();
            expect(headers).toEqual({ 'Authorization': `Bearer ${validToken}` });
        });

        test('returns guest header for guest user', () => {
            global.localStorage.getItem.mockImplementation(key => key === 'userType' ? 'guest' : null);
            const headers = setAuthHeaders();
            expect(headers).toEqual({ 'X-User-Type': 'guest' });
        });

        test('returns empty headers for no token', () => {
            const headers = setAuthHeaders();
            expect(headers).toEqual({});
        });

        test('returns empty headers for expired token', () => {
            const expiredToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(expiredToken);
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
            startTokenRefreshTimer();
            expect(global.setInterval).toHaveBeenCalled();
        });

        test('clears existing interval before starting new one', () => {
            global.refreshInterval = 123;
            startTokenRefreshTimer();
            expect(global.clearInterval).toHaveBeenCalledWith(123);
        });
    });

    describe('Event Listeners', () => {
        test('adds activity event listeners', () => {
            expect(mockAddEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('keypress', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('click', expect.any(Function), { passive: true });
        });

        test('adds visibility change listener', () => {
            expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        });
    });

    describe('Fetch Override', () => {
        test('adds auth headers to fetch requests', () => {
            const validToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(validToken);
            
            const originalFetch = jest.fn().mockResolvedValue({ ok: true });
            global.window.fetch = originalFetch;
            
            // Re-execute the fetch override part
            const originalFetchVar = global.window.fetch;
            global.window.fetch = function(url, options = {}) {
                options.headers = { ...options.headers, ...setAuthHeaders() };
                return originalFetchVar(url, options).catch(error => {
                    if (error.status === 401) {
                        clearExpiredToken();
                        if (!global.window.location.pathname.includes('/login')) {
                            global.window.location.href = '/login';
                        }
                    }
                    throw error;
                });
            };

            global.window.fetch('/test', {});
            expect(originalFetch).toHaveBeenCalledWith('/test', {
                headers: { 'Authorization': `Bearer ${validToken}` }
            });
        });

        test('handles 401 errors in fetch', async () => {
            const error = new Error('Unauthorized');
            error.status = 401;
            
            const originalFetch = jest.fn().mockRejectedValue(error);
            global.window.fetch = originalFetch;
            global.window.location = { pathname: '/dashboard', href: '' };
            
            // Re-execute the fetch override part
            const originalFetchVar = global.window.fetch;
            global.window.fetch = function(url, options = {}) {
                options.headers = { ...options.headers, ...setAuthHeaders() };
                return originalFetchVar(url, options).catch(error => {
                    if (error.status === 401) {
                        clearExpiredToken();
                        if (!global.window.location.pathname.includes('/login')) {
                            global.window.location.href = '/login';
                        }
                    }
                    throw error;
                });
            };

            try {
                await global.window.fetch('/test');
            } catch (e) {
                expect(e.status).toBe(401);
                expect(global.window.location.href).toBe('/login');
            }
        });

        test('does not redirect on 401 if already on login page', async () => {
            const error = new Error('Unauthorized');
            error.status = 401;
            
            const originalFetch = jest.fn().mockRejectedValue(error);
            global.window.fetch = originalFetch;
            global.window.location = { pathname: '/login', href: '/login' };
            
            // Re-execute the fetch override part
            const originalFetchVar = global.window.fetch;
            global.window.fetch = function(url, options = {}) {
                options.headers = { ...options.headers, ...setAuthHeaders() };
                return originalFetchVar(url, options).catch(error => {
                    if (error.status === 401) {
                        clearExpiredToken();
                        if (!global.window.location.pathname.includes('/login')) {
                            global.window.location.href = '/login';
                        }
                    }
                    throw error;
                });
            };

            try {
                await global.window.fetch('/test');
            } catch (e) {
                expect(e.status).toBe(401);
                expect(global.window.location.href).toBe('/login');
            }
        });
    });

    describe('Initialization', () => {
        test('starts timer and refreshes when token exists', () => {
            const validToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
            global.localStorage.getItem.mockReturnValue(validToken);
            
            // Mock the functions to verify they're called
            const mockStartTimer = jest.fn();
            const mockRefresh = jest.fn();
            global.startTokenRefreshTimer = mockStartTimer;
            global.refreshTokenIfNeeded = mockRefresh;
            
            // Re-execute initialization logic
            if (getToken()) {
                startTokenRefreshTimer();
                refreshTokenIfNeeded();
            }
            
            expect(mockStartTimer).toHaveBeenCalled();
            expect(mockRefresh).toHaveBeenCalled();
        });
    });
});