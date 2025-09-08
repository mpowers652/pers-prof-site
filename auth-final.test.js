/**
 * @jest-environment jsdom
 */

// Mock console methods
global.console = {
    log: jest.fn(() => undefined),
    error: jest.fn(() => undefined)
};

// Mock global objects with proper Jest mock
const mockFetch = jest.fn();
global.fetch = mockFetch;
global.window = { fetch: mockFetch };
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

// Mock event listeners comprehensively
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockDispatchEvent = jest.fn();

document.addEventListener = mockAddEventListener;
document.removeEventListener = mockRemoveEventListener;
document.dispatchEvent = mockDispatchEvent;
document.querySelectorAll = jest.fn(() => []);

// Mock element event listeners
Element.prototype.addEventListener = jest.fn();
Element.prototype.removeEventListener = jest.fn();
Element.prototype.dispatchEvent = jest.fn();
Object.defineProperty(document, 'hidden', {
    writable: true,
    value: false
});

// Mock window with navigation prevention
const mockLocation = {
    pathname: '/',
    href: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn()
};

// Prevent actual navigation by intercepting href assignments
Object.defineProperty(mockLocation, 'href', {
    get: () => mockLocation._href || '',
    set: (value) => {
        mockLocation._href = value;
        // Don't actually navigate, just track the assignment
    }
});

global.window = {
    __authToken: null,
    location: mockLocation,
    fetch: mockFetch,
    Date: Date,
    setInterval: jest.fn(),
    clearInterval: jest.fn()
};

// Mock history API
global.window.history = {
    pushState: jest.fn(),
    replaceState: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    go: jest.fn()
};

// Mock timers
global.setInterval = jest.fn();
global.clearInterval = jest.fn();

// Mock btoa/atob for JWT parsing
global.btoa = jest.fn().mockImplementation((str) => Buffer.from(str).toString('base64'));
global.atob = jest.fn().mockImplementation((str) => Buffer.from(str, 'base64').toString());

// Load auth.js AFTER all mocks are set up
require('./auth.js');

describe('Auth Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.localStorage.getItem.mockReturnValue(null);
        document.cookie = '';
        global.window.__authToken = null;
        document.hidden = false;
        global.lastActivity = Date.now();
        global.refreshInterval = null;
        
        // Clear event listener mocks
        mockAddEventListener.mockClear();
        mockRemoveEventListener.mockClear();
        mockDispatchEvent.mockClear();
        mockFetch.mockClear();
    });

    test('basic functionality works', () => {
        expect(isTokenExpired(null)).toBe(true);
        expect(isTokenExpiringSoon(null)).toBe(false);
        expect(isValidJWT(null)).toBe(false);
        expect(getCookieToken()).toBe(null);
        expect(getToken()).toBe(null);
        expect(clearExpiredToken()).toBe(false);
        expect(setAuthHeaders()).toEqual({});
        expect(handleAuthResponse({status: 200})).toEqual({requiresLogin: false});
        expect(handleAuthResponse({status: 401})).toEqual({requiresLogin: true, redirectTo: '/login'});
    });

    test('event listener mocking works', () => {
        expect(mockAddEventListener).toBeDefined();
        expect(mockRemoveEventListener).toBeDefined();
        expect(mockDispatchEvent).toBeDefined();
    });

    test('async functions work', async () => {
        const result = await refreshTokenIfNeeded();
        expect(result).toBe(false);
    });
});