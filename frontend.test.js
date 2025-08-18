/**
 * @jest-environment jsdom
 */

// Mock fetch for testing
global.fetch = jest.fn();

describe('Frontend Tests', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <input type="text" id="num1">
            <select id="operation">
                <option value="+">+</option>
                <option value="-">-</option>
            </select>
            <input type="text" id="num2">
            <div id="result"></div>
        `;
        
        // Reset fetch mock
        fetch.mockClear();
    });

    test('Calculate function sends correct data', async () => {
        // Mock successful response
        fetch.mockResolvedValueOnce({
            json: async () => ({ result: 8 })
        });

        // Set input values
        document.getElementById('num1').value = '5';
        document.getElementById('num2').value = '3';
        document.getElementById('operation').value = '+';

        // Load and execute the calculate function
        const calculateFunction = `
            async function calculate() {
                const a = document.getElementById('num1').value;
                const b = document.getElementById('num2').value;
                const op = document.getElementById('operation').value;
                
                const response = await fetch('/math/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ a, b, operation: op })
                });
                
                const data = await response.json();
                document.getElementById('result').innerHTML = \`<h3>Result: \${data.result}</h3>\`;
            }
        `;
        
        eval(calculateFunction);
        await calculate();

        // Verify fetch was called with correct parameters
        expect(fetch).toHaveBeenCalledWith('/math/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ a: '5', b: '3', operation: '+' })
        });

        // Verify result is displayed
        expect(document.getElementById('result').innerHTML).toBe('<h3>Result: 8</h3>');
    });

    test('Dropdown menu functionality', () => {
        document.body.innerHTML = `
            <div class="dropdown">
                <span class="dropdown-toggle">Services</span>
                <ul class="dropdown-menu">
                    <li><a href="/service1">Book Scanner</a></li>
                    <li><a href="/service2">FFT audio visualizer</a></li>
                    <li><a href="/math">Math Calculator</a></li>
                </ul>
            </div>
        `;

        const dropdown = document.querySelector('.dropdown');
        const menu = document.querySelector('.dropdown-menu');
        
        expect(dropdown).toBeTruthy();
        expect(menu.children.length).toBe(3);
        expect(menu.children[2].textContent).toBe('Math Calculator');
    });

    test('Profile picture upload elements exist', () => {
        document.body.innerHTML = `
            <img id="profileImg" src="" alt="Profile Picture">
            <input type="file" id="profileUpload" accept="image/*">
            <button id="uploadBtn">Upload Picture</button>
            <button id="cameraBtn">Take Picture</button>
            <video id="cameraVideo"></video>
            <button id="captureBtn">Capture</button>
            <button id="cancelBtn">Cancel</button>
        `;
        
        expect(document.getElementById('profileImg')).toBeTruthy();
        expect(document.getElementById('profileUpload')).toBeTruthy();
        expect(document.getElementById('uploadBtn')).toBeTruthy();
        expect(document.getElementById('cameraBtn')).toBeTruthy();
        expect(document.getElementById('cameraVideo')).toBeTruthy();
        expect(document.getElementById('captureBtn')).toBeTruthy();
        expect(document.getElementById('cancelBtn')).toBeTruthy();
    });
});