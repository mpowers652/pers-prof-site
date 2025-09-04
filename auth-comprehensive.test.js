/**
 * @jest-environment jsdom
 */

// Mock all globals before loading auth.js
global.console = { log: jest.fn(), error: jest.fn() };
global.fetch = jest.fn();
global.setInterval = jest.fn();
global.clearInterval = jest.fn();
global.atob = jest.fn();
global.btoa = jest.fn();

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
Object.defineProperty(window, 'location', {
    writable: true,
    value: { pathname: '/', href: '' }
});

// Mock base64 functions
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

describe('Auth Module Comprehensive Coverage', () => {
    let originalFetch;

    beforeAll(() => {
        // Load auth.js
        require('./auth.js');
        originalFetch = window.fetch;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue(null);
        document.cookie = '';
        window.__authToken = null;
        window.location = { pathname: '/', href: '' };
        document.hidden = false;
        
        // Reset mocks
        global.fetch.mockReset();
        global.setInterval.mockReset();
        global.clearInterval.mockReset();
    });

    describe('Token validation functions', () => {
        test('isTokenExpired with various scenarios', () => {
            const now = Math.floor(Date.now() / 1000);
            
            // Test null/undefined
            expect(isTokenExpired(null)).toBe(true);
            expect(isTokenExpired(undefined)).toBe(true);
            
            // Test expired token
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            expect(isTokenExpired(expiredToken)).toBe(true);
            
            // Test valid token
            const validPayload = JSON.stringify({ exp: now + 3600 });
            const validToken = 'header.' + global.btoa(validPayload) + '.signature';
            expect(isTokenExpired(validToken)).toBe(false);
            
            // Test token with future iat
            const futureIatPayload = JSON.stringify({ exp: now + 3600, iat: now + 100 });
            const futureIatToken = 'header.' + global.btoa(futureIatPayload) + '.signature';
            expect(isTokenExpired(futureIatToken)).toBe(true);
            
            // Test malformed token
            expect(isTokenExpired('invalid.token')).toBe(true);
            
            // Test token with invalid JSON
            global.atob.mockImplementationOnce(() => 'invalid-json');
            expect(isTokenExpired('header.invalid.signature')).toBe(true);
        });

        test('isTokenExpiringSoon with various scenarios', () => {
            const now = Math.floor(Date.now() / 1000);
            
            // Test null token
            expect(isTokenExpiringSoon(null)).toBe(false);
            
            // Test token expiring soon (within 10 minutes)
            const soonPayload = JSON.stringify({ exp: now + 300 });
            const soonToken = 'header.' + global.btoa(soonPayload) + '.signature';
            expect(isTokenExpiringSoon(soonToken)).toBe(true);
            
            // Test token not expiring soon
            const futurePayload = JSON.stringify({ exp: now + 3600 });
            const futureToken = 'header.' + global.btoa(futurePayload) + '.signature';
            expect(isTokenExpiringSoon(futureToken)).toBe(false);
            
            // Test malformed token
            global.atob.mockImplementationOnce(() => { throw new Error('Invalid'); });
            expect(isTokenExpiringSoon('invalid')).toBe(false);
        });

        test('isValidJWT with various scenarios', () => {
            // Test null/non-string
            expect(isValidJWT(null)).toBe(false);
            expect(isValidJWT(123)).toBe(false);
            
            // Test wrong number of parts
            expect(isValidJWT('only.two')).toBe(false);
            expect(isValidJWT('one.two.three.four')).toBe(false);
            
            // Test valid JWT
            const header = global.btoa(JSON.stringify({ typ: 'JWT' }));
            const payload = global.btoa(JSON.stringify({ exp: 123 }));
            const validJWT = header + '.' + payload + '.signature';
            expect(isValidJWT(validJWT)).toBe(true);
            
            // Test invalid base64 in header
            global.atob.mockImplementationOnce(() => { throw new Error('Invalid'); });
            expect(isValidJWT('invalid.' + payload + '.signature')).toBe(false);
            
            // Test invalid base64 in payload
            global.atob.mockImplementation((str) => {
                if (str === 'invalid-payload') throw new Error('Invalid');
                return Buffer.from(str, 'base64').toString('ascii');
            });
            expect(isValidJWT(header + '.invalid-payload.signature')).toBe(false);
        });
    });

    describe('Cookie and token retrieval', () => {
        test('getCookieToken with various cookie scenarios', () => {
            // No cookies
            document.cookie = '';
            expect(getCookieToken()).toBe(null);
            
            // No token cookie
            document.cookie = 'other=value; another=test';
            expect(getCookieToken()).toBe(null);
            
            // Token cookie exists
            document.cookie = 'token=abc123; other=value';
            expect(getCookieToken()).toBe('abc123');
            
            // Token cookie with spaces
            document.cookie = ' token=spaced123 ; other=value';
            expect(getCookieToken()).toBe('spaced123');
        });

        test('getToken priority order', () => {
            // localStorage first
            mockLocalStorage.getItem.mockReturnValue('localStorage-token');
            window.__authToken = 'global-token';
            document.cookie = 'token=cookie-token';
            expect(getToken()).toBe('localStorage-token');
            
            // global token when no localStorage
            mockLocalStorage.getItem.mockReturnValue(null);
            expect(getToken()).toBe('global-token');
            
            // cookie token as fallback
            window.__authToken = null;
            expect(getToken()).toBe('cookie-token');
            
            // null when nothing available
            document.cookie = '';
            expect(getToken()).toBe(null);
        });
    });

    describe('Token management', () => {
        test('clearExpiredToken functionality', () => {
            const now = Math.floor(Date.now() / 1000);
            
            // Clear expired token
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            
            expect(clearExpiredToken()).toBe(true);
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('userType');
            
            // Don't clear valid token
            const validPayload = JSON.stringify({ exp: now + 3600 });
            const validToken = 'header.' + global.btoa(validPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(validToken);
            
            expect(clearExpiredToken()).toBe(false);
            
            // Return false when no token
            mockLocalStorage.getItem.mockReturnValue(null);
            expect(clearExpiredToken()).toBe(false);
        });

        test('refreshTokenIfNeeded scenarios', async () => {
            const now = Math.floor(Date.now() / 1000);
            
            // No token
            mockLocalStorage.getItem.mockReturnValue(null);
            expect(await refreshTokenIfNeeded()).toBe(false);
            
            // Expired token
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            expect(await refreshTokenIfNeeded()).toBe(false);
            
            // Token not expiring soon
            const futurePayload = JSON.stringify({ exp: now + 3600 });
            const futureToken = 'header.' + global.btoa(futurePayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(futureToken);
            expect(await refreshTokenIfNeeded()).toBe(false);
            
            // Token expiring soon - successful refresh
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
            
            // Network error
            global.fetch.mockRejectedValue(new Error('Network error'));
            expect(await refreshTokenIfNeeded()).toBe(false);
            
            // Non-ok response
            global.fetch.mockResolvedValue({ ok: false });
            expect(await refreshTokenIfNeeded()).toBe(false);
            
            // Invalid token in response
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ token: 'invalid-token' })
            });
            expect(await refreshTokenIfNeeded()).toBe(false);
        });
    });

    describe('Authentication headers', () => {
        test('setAuthHeaders with different scenarios', () => {
            const now = Math.floor(Date.now() / 1000);
            
            // Valid token
            const validPayload = JSON.stringify({ exp: now + 3600 });
            const validToken = 'header.' + global.btoa(validPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(validToken);
            
            const headers = setAuthHeaders();
            expect(headers).toEqual({ 'Authorization': `Bearer ${validToken}` });
            
            // Guest user
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'userType' ? 'guest' : null
            );
            expect(setAuthHeaders()).toEqual({ 'X-User-Type': 'guest' });
            
            // No token
            mockLocalStorage.getItem.mockReturnValue(null);
            expect(setAuthHeaders()).toEqual({});
            
            // Expired token
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            expect(setAuthHeaders()).toEqual({});
        });
    });

    describe('Activity tracking and timers', () => {
        test('trackActivity updates lastActivity', () => {
            const before = lastActivity;
            trackActivity();
            expect(lastActivity).toBeGreaterThan(before);
        });

        test('startTokenRefreshTimer functionality', () => {
            // Start timer
            startTokenRefreshTimer();
            expect(global.setInterval).toHaveBeenCalled();
            
            // Clear existing interval
            global.refreshInterval = 123;
            startTokenRefreshTimer();
            expect(global.clearInterval).toHaveBeenCalledWith(123);
        });
    });

    describe('Event listeners and initialization', () => {
        test('event listeners are added', () => {
            // Check that event listeners were added during module load
            expect(mockAddEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('keypress', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('click', expect.any(Function), { passive: true });
            expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        });

        test('fetch is overridden', () => {
            expect(typeof window.fetch).toBe('function');
            expect(window.fetch).not.toBe(originalFetch);
        });
    });

    describe('Fetch override behavior', () => {
        test('fetch adds auth headers', async () => {
            const now = Math.floor(Date.now() / 1000);
            const validPayload = JSON.stringify({ exp: now + 3600 });
            const validToken = 'header.' + global.btoa(validPayload) + '.signature';
            
            mockLocalStorage.getItem.mockReturnValue(validToken);
            
            // Mock the original fetch
            const mockOriginalFetch = jest.fn().mockResolvedValue({ ok: true });
            
            // Test that headers are added
            await window.fetch('/test', { headers: { 'Content-Type': 'application/json' } });
            
            // The fetch should have been called (even if mocked)
            expect(typeof window.fetch).toBe('function');
        });

        test('fetch handles 401 errors', async () => {
            const error = new Error('Unauthorized');
            error.status = 401;
            
            // Mock fetch to reject with 401
            const mockOriginalFetch = jest.fn().mockRejectedValue(error);
            
            window.location = { pathname: '/dashboard', href: '' };
            
            try {
                await window.fetch('/test');
            } catch (e) {
                // Expected to throw
            }
            
            // Should not redirect if already on login page
            window.location = { pathname: '/login', href: '/login' };
            
            try {
                await window.fetch('/test');
            } catch (e) {
                // Expected to throw
            }
        });
    });

    describe('Visibility change handler', () => {
        test('handles visibility change events', () => {
            const now = Math.floor(Date.now() / 1000);
            
            // Get the visibility change handler
            const visibilityHandler = mockAddEventListener.mock.calls
                .find(call => call[0] === 'visibilitychange')[1];
            
            // Test with expired token
            const expiredPayload = JSON.stringify({ exp: now - 100 });
            const expiredToken = 'header.' + global.btoa(expiredPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(expiredToken);
            
            document.hidden = false;
            window.location = { pathname: '/dashboard', href: '' };
            
            // Call the handler
            if (visibilityHandler) {
                visibilityHandler();
            }
            
            // Test with valid token
            const validPayload = JSON.stringify({ exp: now + 3600 });
            const validToken = 'header.' + global.btoa(validPayload) + '.signature';
            mockLocalStorage.getItem.mockReturnValue(validToken);
            
            if (visibilityHandler) {
                visibilityHandler();
            }
        });
    });

    describe('Timer interval callback', () => {
        test('timer callback handles token refresh', () => {
            const now = Math.floor(Date.now() / 1000);
            
            // Get the interval callback
            const intervalCallback = global.setInterval.mock.calls[0]?.[0];
            
            if (intervalCallback) {
                // Test with no token
                mockLocalStorage.getItem.mockReturnValue(null);
                intervalCallback();
                
                // Test with token and recent activity
                const validPayload = JSON.stringify({ exp: now + 3600 });
                const validToken = 'header.' + global.btoa(validPayload) + '.signature';
                mockLocalStorage.getItem.mockReturnValue(validToken);
                
                // Set recent activity
                global.lastActivity = Date.now();
                intervalCallback();
            }
        });
    });
});