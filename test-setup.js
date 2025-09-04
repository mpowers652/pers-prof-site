// Global test setup for Jest

// Add OpenAI shims for Node.js environment before any imports
if (typeof global.Request === 'undefined' && typeof global.Response === 'undefined') {
    require('openai/shims/node');
}

// Add TextEncoder/TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Set up localStorage mock
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
});

// Mock fetch with proper jest mock
const mockFetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
}));

// Add jest mock methods
mockFetch.mockResolvedValue = jest.fn().mockImplementation((value) => {
    mockFetch.mockImplementation(() => Promise.resolve(value));
    return mockFetch;
});

mockFetch.mockRejectedValue = jest.fn().mockImplementation((error) => {
    mockFetch.mockImplementation(() => Promise.reject(error));
    return mockFetch;
});

global.fetch = mockFetch;
window.fetch = mockFetch;

// Mock timers
global.setInterval = jest.fn();
global.clearInterval = jest.fn();
window.setInterval = global.setInterval;
window.clearInterval = global.clearInterval;

// Mock btoa/atob for JWT handling
global.btoa = global.btoa || ((str) => Buffer.from(str).toString('base64'));
global.atob = global.atob || ((str) => Buffer.from(str, 'base64').toString());

// Mock document.cookie if not already defined
if (!document.cookie || typeof document.cookie !== 'string') {
    let cookieValue = '';
    Object.defineProperty(document, 'cookie', {
        get: () => cookieValue,
        set: (value) => { cookieValue = value; },
        configurable: true
    });
}

// Mock document.addEventListener if not already defined
if (!document.addEventListener) {
    document.addEventListener = jest.fn();
}

// Reset all mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage mock
    if (window.localStorage && window.localStorage.getItem && window.localStorage.getItem.mockReturnValue) {
        window.localStorage.getItem.mockReturnValue(null);
    }
    
    // Reset fetch mock
    if (global.fetch && global.fetch.mockClear) {
        global.fetch.mockClear();
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve('')
        });
    }
    
    // Reset document.cookie
    if (document.cookie !== undefined) {
        document.cookie = '';
    }
    
    // Reset window properties
    if (window.__authToken !== undefined) {
        window.__authToken = null;
    }
    
    // Reset location if it exists and is writable
    if (window.location && typeof window.location === 'object') {
        try {
            window.location.pathname = '/';
            window.location.href = '';
        } catch (e) {
            // Ignore if location is not writable
        }
    }
});