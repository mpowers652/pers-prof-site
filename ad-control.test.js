/**
 * @jest-environment jsdom
 */

// Mock console methods
const consoleSpy = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation()
};

describe('Ad Control Module', () => {
    let mockLocalStorage, mockFetch, mockAds, mockQuerySelectorAll, mockAddEventListener;
    let checkAdVisibility;
    
    beforeEach(() => {
        // Clear console spies
        consoleSpy.log.mockClear();
        consoleSpy.error.mockClear();
        
        // Mock localStorage
        mockLocalStorage = {
            getItem: jest.fn()
        };
        Object.defineProperty(global, 'localStorage', {
            value: mockLocalStorage,
            writable: true
        });

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
        test('returns early for guest users', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'userType' ? 'guest' : 'some-token'
            );
            
            await checkAdVisibility();
            
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('returns early when no token', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'userType' ? 'user' : null
            );
            
            await checkAdVisibility();
            
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('makes fetch request with valid token', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'token' ? 'valid-token' : 'user'
            );
            
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({
                    user: { hideAds: false }
                })
            });

            await checkAdVisibility();
            
            expect(mockFetch).toHaveBeenCalledWith('/auth/verify', {
                headers: { 'Authorization': 'Bearer valid-token' }
            });
        });

        test('hides ads when user has hideAds flag', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'token' ? 'valid-token' : 'user'
            );
            
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({
                    user: { hideAds: true }
                })
            });

            await checkAdVisibility();
            
            expect(mockQuerySelectorAll).toHaveBeenCalledWith('.ad-container, .adsbygoogle');
            expect(mockAds[0].style.display).toBe('none');
            expect(mockAds[1].style.display).toBe('none');
        });

        test('does not hide ads when user has hideAds false', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'token' ? 'valid-token' : 'user'
            );
            
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({
                    user: { hideAds: false }
                })
            });

            await checkAdVisibility();
            
            expect(mockAds[0].style.display).toBe('block');
            expect(mockAds[1].style.display).toBe('block');
        });

        test('does not hide ads when user object is missing', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'token' ? 'valid-token' : 'user'
            );
            
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({})
            });

            await checkAdVisibility();
            
            expect(mockAds[0].style.display).toBe('block');
            expect(mockAds[1].style.display).toBe('block');
        });

        test('does not hide ads when data.user is null', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'token' ? 'valid-token' : 'user'
            );
            
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({
                    user: null
                })
            });

            await checkAdVisibility();
            
            expect(mockAds[0].style.display).toBe('block');
            expect(mockAds[1].style.display).toBe('block');
        });

        test('handles fetch error gracefully', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'token' ? 'valid-token' : 'user'
            );
            
            const error = new Error('Network error');
            mockFetch.mockRejectedValue(error);
            
            await checkAdVisibility();
            
            expect(consoleSpy.log).toHaveBeenCalledWith('Ad visibility check failed');
            expect(consoleSpy.error).toHaveBeenCalledWith(error);
        });

        test('handles json parsing error', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'token' ? 'valid-token' : 'user'
            );
            
            const jsonError = new Error('JSON parse error');
            mockFetch.mockResolvedValue({
                json: () => Promise.reject(jsonError)
            });
            
            await checkAdVisibility();
            
            expect(consoleSpy.log).toHaveBeenCalledWith('Ad visibility check failed');
            expect(consoleSpy.error).toHaveBeenCalledWith(jsonError);
        });

        test('handles both userType guest and token present (guest takes precedence)', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'userType' ? 'guest' : 'valid-token'
            );
            
            await checkAdVisibility();
            
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('handles empty token string', async () => {
            mockLocalStorage.getItem.mockImplementation(key => 
                key === 'userType' ? 'user' : ''
            );
            
            await checkAdVisibility();
            
            expect(mockFetch).not.toHaveBeenCalled();
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