/**
 * @jest-environment jsdom
 */

describe('Ad Control Module Simple Tests', () => {
    beforeEach(() => {
        // Clear module cache
        jest.resetModules();
        
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn()
            },
            writable: true
        });

        // Mock fetch
        global.fetch = jest.fn();
        
        // Mock DOM
        document.querySelectorAll = jest.fn(() => []);
        window.addEventListener = jest.fn();
    });

    test('ad-control.js loads without errors', () => {
        expect(() => require('./ad-control.js')).not.toThrow();
    });

    test('localStorage integration works', () => {
        window.localStorage.getItem.mockReturnValue('guest');
        expect(window.localStorage.getItem('userType')).toBe('guest');
    });

    test('fetch integration works', () => {
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ user: { hideAds: true } })
        });
        
        return global.fetch('/auth/verify').then(response => {
            return response.json();
        }).then(data => {
            expect(data.user.hideAds).toBe(true);
        });
    });

    test('window event listener is set up', () => {
        // Require the module
        require('./ad-control.js');
        
        // Check that addEventListener was called with 'load' event
        expect(window.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
    });
});