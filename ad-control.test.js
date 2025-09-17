/**
 * @jest-environment jsdom
 */

// Mock console methods
const consoleSpy = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation()
};

describe('Ad Control Module', () => {
    let mockFetch, mockAds, mockQuerySelectorAll, mockAddEventListener;
    let checkAdVisibility;
    
    beforeEach(() => {
        // Clear console spies
        consoleSpy.log.mockClear();
        consoleSpy.error.mockClear();
        
        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;

        // Mock DOM elements
        mockAds = [
            { style: { display: 'block' } },
            { style: { display: 'block' } }
        ];

    mockQuerySelectorAll = jest.fn(() => mockAds);
        document.querySelectorAll = mockQuerySelectorAll;

    mockAddEventListener = jest.fn();
    window.addEventListener = mockAddEventListener;

        // Clear module cache and require
        delete require.cache[require.resolve('./ad-control.js')];
        const adControlModule = require('./ad-control.js');
        checkAdVisibility = adControlModule.checkAdVisibility;
    });

    describe('checkAdVisibility function', () => {
        test('hides ads when injected user is premium', async () => {
            window.currentUser = { subscription: 'premium' };
            await checkAdVisibility();
            expect(mockQuerySelectorAll).toHaveBeenCalledWith('.ad-container, .adsbygoogle');
            expect(mockAds[0].style.display).toBe('none');
            expect(mockAds[1].style.display).toBe('none');
            delete window.currentUser;
        });

        test('does not hide ads when injected user is basic', async () => {
            window.currentUser = { subscription: 'basic' };
            await checkAdVisibility();
            expect(mockAds[0].style.display).toBe('block');
            expect(mockAds[1].style.display).toBe('block');
            delete window.currentUser;
        });

        test('no injected user and whoami returns premium -> hides ads', async () => {
            mockFetch.mockResolvedValue({ json: () => Promise.resolve({ subscription: 'premium' }) });
            await checkAdVisibility();
            expect(mockFetch).toHaveBeenCalledWith('/auth/whoami', { credentials: 'include' });
            expect(mockQuerySelectorAll).toHaveBeenCalledWith('.ad-container, .adsbygoogle');
        });

        test('no injected user and whoami returns empty -> does not hide ads', async () => {
            mockFetch.mockResolvedValue({ json: () => Promise.resolve({}) });
            await checkAdVisibility();
            expect(mockAds[0].style.display).toBe('block');
            expect(mockAds[1].style.display).toBe('block');
        });

        test('whoami returns user:null -> does not hide ads', async () => {
            mockFetch.mockResolvedValue({ json: () => Promise.resolve({ user: null }) });
            await checkAdVisibility();
            expect(mockAds[0].style.display).toBe('block');
            expect(mockAds[1].style.display).toBe('block');
        });

        test('handles fetch error gracefully', async () => {
            const error = new Error('Network error');
            mockFetch.mockRejectedValue(error);
            await checkAdVisibility();
            expect(consoleSpy.error).toHaveBeenCalled();
        });

        test('handles json parsing error gracefully', async () => {
            const jsonError = new Error('JSON parse error');
            mockFetch.mockResolvedValue({ json: () => Promise.reject(jsonError) });
            await checkAdVisibility();
            expect(consoleSpy.error).toHaveBeenCalled();
        });
    });

    test('module exports in Node.js environment', () => {
        // Test the module.exports branch
        delete require.cache[require.resolve('./ad-control.js')];
        const originalModule = global.module;
        global.module = { exports: {} };
        
        const adControlModule = require('./ad-control.js');
        
        expect(adControlModule.checkAdVisibility).toBeDefined();
        expect(typeof adControlModule.checkAdVisibility).toBe('function');
        
        global.module = originalModule;
    });
});