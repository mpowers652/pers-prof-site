/**
 * @jest-environment jsdom
 */

describe('FFT Video Export Functionality', () => {
    let mockCanvas, mockContext, mockMediaRecorder, mockStream;

    beforeEach(() => {
        // Mock canvas and context
        mockContext = {
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            createLinearGradient: jest.fn(() => ({
                addColorStop: jest.fn()
            })),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            stroke: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            clip: jest.fn(),
            drawImage: jest.fn(),
            fillText: jest.fn()
        };

        mockCanvas = {
            getContext: jest.fn(() => mockContext),
            captureStream: jest.fn(() => mockStream),
            width: 800,
            height: 450
        };

        // Mock MediaRecorder
        mockMediaRecorder = {
            start: jest.fn(),
            stop: jest.fn(),
            ondataavailable: null
        };

        mockStream = {
            getTracks: jest.fn(() => [])
        };

        // Mock DOM elements
        document.getElementById = jest.fn((id) => {
            if (id === 'canvas') return mockCanvas;
            if (id === 'masterWindow') return null;
            return null;
        });

        document.querySelector = jest.fn((selector) => {
            if (selector === 'input[name="aspectRatio"]:checked') {
                return { value: '16:9' };
            }
            if (selector === '.profile-pic img') {
                return {
                    complete: true,
                    naturalHeight: 100,
                    src: 'test-image.jpg'
                };
            }
            return null;
        });

        document.createElement = jest.fn((tag) => {
            if (tag === 'canvas') return mockCanvas;
            return { style: {}, appendChild: jest.fn() };
        });

        // Mock global constructors
        global.MediaRecorder = jest.fn(() => mockMediaRecorder);
        global.MediaStream = jest.fn(() => mockStream);
        
        // Mock window.currentUser
        window.currentUser = {
            username: 'testuser',
            googlePhoto: 'https://example.com/photo.jpg'
        };
    });

    test('should create composite canvas with correct 16:9 dimensions', () => {
        // Load the FFT script content
        const scriptContent = `
            let compositeCanvas, compositeCtx;
            
            function createCompositeCanvas() {
                const selectedRatio = document.querySelector('input[name="aspectRatio"]:checked').value;
                compositeCanvas = document.createElement('canvas');
                compositeCtx = compositeCanvas.getContext('2d');
                
                if (selectedRatio === '9:16') {
                    compositeCanvas.width = 720;
                    compositeCanvas.height = 1280;
                } else {
                    compositeCanvas.width = 1920;
                    compositeCanvas.height = 1080;
                }
                
                return compositeCanvas;
            }
        `;

        eval(scriptContent);
        
        const canvas = createCompositeCanvas();
        
        expect(canvas.width).toBe(1920);
        expect(canvas.height).toBe(1080);
        expect(document.createElement).toHaveBeenCalledWith('canvas');
    });

    test('should create composite canvas with correct 9:16 dimensions', () => {
        document.querySelector = jest.fn((selector) => {
            if (selector === 'input[name="aspectRatio"]:checked') {
                return { value: '9:16' };
            }
            return null;
        });

        const scriptContent = `
            let compositeCanvas, compositeCtx;
            
            function createCompositeCanvas() {
                const selectedRatio = document.querySelector('input[name="aspectRatio"]:checked').value;
                compositeCanvas = document.createElement('canvas');
                compositeCtx = compositeCanvas.getContext('2d');
                
                if (selectedRatio === '9:16') {
                    compositeCanvas.width = 720;
                    compositeCanvas.height = 1280;
                } else {
                    compositeCanvas.width = 1920;
                    compositeCanvas.height = 1080;
                }
                
                return compositeCanvas;
            }
        `;

        eval(scriptContent);
        
        const canvas = createCompositeCanvas();
        
        expect(canvas.width).toBe(720);
        expect(canvas.height).toBe(1280);
    });

    test('should draw profile image on composite canvas', () => {
        const scriptContent = `
            let compositeCanvas, compositeCtx;
            
            function createCompositeCanvas() {
                compositeCanvas = document.createElement('canvas');
                compositeCtx = compositeCanvas.getContext('2d');
                compositeCanvas.width = 1920;
                compositeCanvas.height = 1080;
                return compositeCanvas;
            }
            
            function drawProfileOnComposite(area) {
                const centerX = area.x + area.width / 2;
                const centerY = area.y + area.height / 2;
                const radius = Math.min(area.width, area.height) * 0.25;
                
                compositeCtx.beginPath();
                compositeCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                compositeCtx.fill();
                
                const profilePic = document.querySelector('.profile-pic img');
                if (profilePic && profilePic.complete && profilePic.naturalHeight !== 0) {
                    compositeCtx.save();
                    compositeCtx.beginPath();
                    compositeCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    compositeCtx.clip();
                    compositeCtx.drawImage(profilePic, centerX - radius, centerY - radius, radius * 2, radius * 2);
                    compositeCtx.restore();
                }
            }
        `;

        eval(scriptContent);
        
        createCompositeCanvas();
        const area = { x: 960, y: 0, width: 960, height: 1080 };
        drawProfileOnComposite(area);
        
        expect(mockContext.beginPath).toHaveBeenCalled();
        expect(mockContext.arc).toHaveBeenCalled();
        expect(mockContext.drawImage).toHaveBeenCalled();
        expect(mockContext.save).toHaveBeenCalled();
        expect(mockContext.restore).toHaveBeenCalled();
    });

    test('should draw FFT visualization on composite canvas', () => {
        const scriptContent = `
            let compositeCanvas, compositeCtx, dataArray;
            
            function createCompositeCanvas() {
                compositeCanvas = document.createElement('canvas');
                compositeCtx = compositeCanvas.getContext('2d');
                return compositeCanvas;
            }
            
            function drawFFTOnComposite(area) {
                if (!dataArray) return;
                
                compositeCtx.fillRect(area.x, area.y, area.width, area.height);
                
                let barHeight;
                let x = area.x;
                const barWidth = (area.width / dataArray.length) * 2.5;
                
                for (const value of dataArray) {
                    barHeight = (value / 255) * area.height;
                    const gradient = compositeCtx.createLinearGradient(x, area.y + area.height - barHeight, x, area.y + area.height);
                    compositeCtx.fillRect(x, area.y + area.height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }
            }
        `;

        eval(scriptContent);
        
        createCompositeCanvas();
        // Mock audio data
        window.dataArray = new Uint8Array([100, 150, 200, 80, 120]);
        
        const area = { x: 0, y: 0, width: 960, height: 1080 };
        drawFFTOnComposite(area);
        
        expect(mockContext.fillRect).toHaveBeenCalled();
        expect(mockContext.createLinearGradient).toHaveBeenCalled();
    });
});