const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('FFT Visualizer Aspect Ratio Tests', () => {
    let dom, window, document;
    
    beforeEach(() => {
        const html = fs.readFileSync(path.join(__dirname, 'fft-visualizer.html'), 'utf8');
        dom = new JSDOM(html, { 
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true
        });
        window = dom.window;
        document = window.document;
        
        // Mock canvas element and global canvas variable
        window.canvas = {
            style: {},
            width: 800,
            height: 450,
            getBoundingClientRect: () => ({ width: 800, height: 450 })
        };
        
        // Mock ResizeObserver
        window.ResizeObserver = class {
            observe() {}
            disconnect() {}
        };
        
        // Mock appendChild to track master window creation
        const originalAppendChild = document.body.appendChild;
        document.body.appendChild = jest.fn(originalAppendChild);
    });

    test('aspect ratio selection should work correctly', () => {
        // Default radio button should be 16:9
        const defaultRadio = document.querySelector('input[name="aspectRatio"][value="16:9"]');
        expect(defaultRadio.checked).toBe(true);
        
        // Should be able to select 9:16
        const verticalRadio = document.querySelector('input[name="aspectRatio"][value="9:16"]');
        verticalRadio.checked = true;
        expect(verticalRadio.checked).toBe(true);
        expect(defaultRadio.checked).toBe(false);
    });

    test('aspect ratio logic should return correct values', () => {
        // Test 16:9 selection
        const horizontalRadio = document.querySelector('input[name="aspectRatio"][value="16:9"]');
        horizontalRadio.checked = true;
        
        const selectedRatio1 = document.querySelector('input[name="aspectRatio"]:checked').value;
        expect(selectedRatio1).toBe('16:9');
        
        // Test 9:16 selection
        const verticalRadio = document.querySelector('input[name="aspectRatio"][value="9:16"]');
        verticalRadio.checked = true;
        
        const selectedRatio2 = document.querySelector('input[name="aspectRatio"]:checked').value;
        expect(selectedRatio2).toBe('9:16');
    });

    test('createMasterWindow function should exist and contain aspect ratio logic', () => {
        expect(typeof window.createMasterWindow).toBe('function');
        
        // Check that the function contains the aspect ratio logic
        const functionString = window.createMasterWindow.toString();
        expect(functionString).toContain('selectedRatio');
        expect(functionString).toContain('9:16');
        expect(functionString).toContain('else');
        expect(functionString).toContain('60vh');
        expect(functionString).toContain('80vw');
    });

    test('toggleAspectRatio function should exist', () => {
        expect(typeof window.toggleAspectRatio).toBe('function');
        
        // Check that the function contains the logic to recreate master window
        const functionString = window.toggleAspectRatio.toString();
        expect(functionString).toContain('createMasterWindow');
        expect(functionString).toContain('masterWindow');
    });

    test('aspect ratio controls should have correct labels', () => {
        const horizontalLabel = document.querySelector('input[value="16:9"]').parentElement;
        const verticalLabel = document.querySelector('input[value="9:16"]').parentElement;
        
        expect(horizontalLabel.textContent.trim()).toContain('Side by Side');
        expect(verticalLabel.textContent.trim()).toContain('Stacked');
    });

    test('CSS should not have fixed dimensions for masterWindow', () => {
        const html = fs.readFileSync(path.join(__dirname, 'fft-visualizer.html'), 'utf8');
        
        // Check that the CSS doesn't contain fixed width/height for #masterWindow
        const masterWindowCSSMatch = html.match(/#masterWindow\s*{[^}]*}/);
        expect(masterWindowCSSMatch).toBeTruthy();
        
        const cssContent = masterWindowCSSMatch[0];
        expect(cssContent).not.toContain('width: 80vw');
        expect(cssContent).not.toContain('height: 60vh');
        expect(cssContent).not.toContain('max-width: 1200px');
        expect(cssContent).not.toContain('max-height: 800px');
    });
});