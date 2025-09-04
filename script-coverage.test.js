/**
 * @jest-environment jsdom
 */

describe('Script.js Complete Coverage', () => {
    let originalDocument;

    beforeAll(() => {
        originalDocument = global.document;
    });

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Clear mocks
        jest.clearAllMocks();
        
        // Mock fetch
        global.fetch = jest.fn();
    });

    test('executes all code paths for complete coverage', async () => {
        // Setup DOM elements that the script expects
        const mockAnchor = {
            addEventListener: jest.fn(),
            getAttribute: jest.fn(() => '#section1')
        };
        
        const mockTarget = {
            scrollIntoView: jest.fn()
        };
        
        const mockServiceGrid = {
            appendChild: jest.fn()
        };
        
        const mockDropdownMenu = {
            appendChild: jest.fn()
        };
        
        const mockServiceCard = {
            className: '',
            innerHTML: ''
        };
        
        const mockMenuItem = {
            innerHTML: ''
        };

        // Mock DOM methods to return our mock elements
        document.querySelectorAll = jest.fn(() => [mockAnchor]);
        document.querySelector = jest.fn((selector) => {
            if (selector === '#section1') return mockTarget;
            if (selector === '.service-grid') return mockServiceGrid;
            if (selector === '.dropdown-menu') return mockDropdownMenu;
            return null;
        });
        document.createElement = jest.fn((tag) => {
            if (tag === 'div') return mockServiceCard;
            if (tag === 'li') return mockMenuItem;
            return {};
        });

        // Load and execute the script
        require('./script.js');

        // Verify navigation setup was called
        expect(document.querySelectorAll).toHaveBeenCalledWith('nav a[href^="#"]');
        expect(mockAnchor.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));

        // Get the click handler and test it
        const clickHandler = mockAnchor.addEventListener.mock.calls[0][1];
        
        // Test click with valid target
        const mockEvent = { preventDefault: jest.fn() };
        clickHandler.call(mockAnchor, mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockTarget.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

        // Test click with no target
        document.querySelector = jest.fn(() => null);
        clickHandler.call(mockAnchor, mockEvent);

        // Test checkServiceStatus function - success case
        global.fetch.mockResolvedValueOnce({ ok: true });
        const result1 = await checkServiceStatus('http://example.com');
        expect(result1).toBe(true);

        // Test checkServiceStatus function - failure case
        global.fetch.mockResolvedValueOnce({ ok: false });
        const result2 = await checkServiceStatus('http://example.com');
        expect(result2).toBe(false);

        // Test checkServiceStatus function - error case
        global.fetch.mockRejectedValueOnce(new Error('Network error'));
        const result3 = await checkServiceStatus('http://example.com');
        expect(result3).toBe(false);

        // Reset querySelector mock for addService test
        document.querySelector = jest.fn((selector) => {
            if (selector === '.service-grid') return mockServiceGrid;
            if (selector === '.dropdown-menu') return mockDropdownMenu;
            return null;
        });

        // Test addService function
        addService('Test Service', 'Test Description', 'http://test.com');
        
        expect(document.querySelector).toHaveBeenCalledWith('.service-grid');
        expect(document.querySelector).toHaveBeenCalledWith('.dropdown-menu');
        expect(document.createElement).toHaveBeenCalledWith('div');
        expect(document.createElement).toHaveBeenCalledWith('li');
        expect(mockServiceCard.className).toBe('service-card');
        expect(mockServiceCard.innerHTML).toContain('Test Service');
        expect(mockServiceCard.innerHTML).toContain('Test Description');
        expect(mockServiceCard.innerHTML).toContain('http://test.com');
        expect(mockMenuItem.innerHTML).toContain('Test Service');
        expect(mockMenuItem.innerHTML).toContain('http://test.com');
        expect(mockServiceGrid.appendChild).toHaveBeenCalledWith(mockServiceCard);
        expect(mockDropdownMenu.appendChild).toHaveBeenCalledWith(mockMenuItem);
    });


});