/**
 * @jest-environment jsdom
 */

describe('Script Module', () => {
    let mockAnchor, mockTarget, mockServiceGrid, mockDropdownMenu, mockServiceCard, mockMenuItem;
    let clickHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock elements
        mockTarget = { scrollIntoView: jest.fn() };
        mockAnchor = {
            addEventListener: jest.fn((event, handler) => { clickHandler = handler; }),
            getAttribute: jest.fn(() => '#test')
        };
        mockServiceGrid = { appendChild: jest.fn() };
        mockDropdownMenu = { appendChild: jest.fn() };
        mockServiceCard = { className: '', innerHTML: '' };
        mockMenuItem = { innerHTML: '' };
        
        // Mock DOM methods
        document.querySelectorAll = jest.fn(() => [mockAnchor]);
        document.querySelector = jest.fn((selector) => {
            if (selector === '.service-grid') return mockServiceGrid;
            if (selector === '.dropdown-menu') return mockDropdownMenu;
            if (selector === '#test') return mockTarget;
            return null;
        });
        document.createElement = jest.fn((tag) => {
            if (tag === 'div') return mockServiceCard;
            if (tag === 'li') return mockMenuItem;
            return {};
        });
        
        global.fetch = jest.fn();
        
        // Clear any existing global functions
        delete global.checkServiceStatus;
        delete global.addService;
    });

    describe('Navigation smooth scrolling', () => {
        test('sets up event listeners for nav links', () => {
            require('./script.js');
            
            expect(document.querySelectorAll).toHaveBeenCalledWith('nav a[href^="#"]');
            expect(mockAnchor.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('handles click event with valid target', () => {
            require('./script.js');
            
            const mockEvent = { preventDefault: jest.fn() };
            clickHandler.call(mockAnchor, mockEvent);
            
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockAnchor.getAttribute).toHaveBeenCalledWith('href');
            expect(document.querySelector).toHaveBeenCalledWith('#test');
            expect(mockTarget.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
        });

        test('handles click event with no target', () => {
            document.querySelector = jest.fn(() => null);
            require('./script.js');
            
            const mockEvent = { preventDefault: jest.fn() };
            clickHandler.call(mockAnchor, mockEvent);
            
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockTarget.scrollIntoView).not.toHaveBeenCalled();
        });
    });

    describe('checkServiceStatus function', () => {
        test('returns true for successful response', async () => {
            global.fetch.mockResolvedValue({ ok: true });
            
            // Execute the script to define the function
            const scriptCode = require('fs').readFileSync('./script.js', 'utf8');
            const vm = require('vm');
            const context = { 
                document, 
                fetch: global.fetch,
                console,
                checkServiceStatus: undefined
            };
            vm.createContext(context);
            vm.runInContext(scriptCode, context);
            
            const result = await context.checkServiceStatus('http://test.com');
            expect(result).toBe(true);
        });

        test('returns false for failed response', async () => {
            global.fetch.mockResolvedValue({ ok: false });
            
            const scriptCode = require('fs').readFileSync('./script.js', 'utf8');
            const vm = require('vm');
            const context = { 
                document, 
                fetch: global.fetch,
                console,
                checkServiceStatus: undefined
            };
            vm.createContext(context);
            vm.runInContext(scriptCode, context);
            
            const result = await context.checkServiceStatus('http://test.com');
            expect(result).toBe(false);
        });

        test('returns false for network error', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            const scriptCode = require('fs').readFileSync('./script.js', 'utf8');
            const vm = require('vm');
            const context = { 
                document, 
                fetch: global.fetch,
                console,
                checkServiceStatus: undefined
            };
            vm.createContext(context);
            vm.runInContext(scriptCode, context);
            
            const result = await context.checkServiceStatus('http://test.com');
            expect(result).toBe(false);
        });
    });

    describe('addService function', () => {
        test('creates and adds service card and menu item', () => {
            const scriptCode = require('fs').readFileSync('./script.js', 'utf8');
            const vm = require('vm');
            const context = { 
                document, 
                fetch: global.fetch,
                console,
                addService: undefined
            };
            vm.createContext(context);
            vm.runInContext(scriptCode, context);
            
            context.addService('Test Service', 'Test Description', 'http://test.com');
            
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
});