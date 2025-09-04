const { spawn } = require('child_process');
const EventEmitter = require('events');

// Mock child_process
jest.mock('child_process');

describe('Start Module', () => {
    let mockProcess;
    let originalExit;
    let originalConsoleLog;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockProcess = new EventEmitter();
        mockProcess.kill = jest.fn();
        spawn.mockImplementation(() => mockProcess);
        
        originalExit = process.exit;
        originalConsoleLog = console.log;
        process.exit = jest.fn();
        console.log = jest.fn();
        console.error = jest.fn();
        
        // Reset module state
        jest.resetModules();
    });

    afterEach(() => {
        process.exit = originalExit;
        console.log = originalConsoleLog;
    });

    test('starts server successfully', () => {
        require('./start.js');
        
        expect(spawn).toHaveBeenCalledWith('node', ['server.js'], {
            stdio: 'inherit',
            cwd: expect.any(String)
        });
        expect(console.log).toHaveBeenCalledWith('Starting server (attempt 1)');
    });

    test('restarts server on exit with non-zero code', (done) => {
        require('./start.js');
        
        setTimeout(() => {
            mockProcess.emit('exit', 1);
            
            setTimeout(() => {
                expect(console.log).toHaveBeenCalledWith('Server exited with code 1');
                expect(console.log).toHaveBeenCalledWith('Restarting server in 2 seconds...');
                done();
            }, 10);
        }, 10);
    });

    test('exits after max restart attempts', (done) => {
        require('./start.js');
        
        // Simulate 5 failed restarts
        let exitCount = 0;
        const simulateExit = () => {
            exitCount++;
            mockProcess.emit('exit', 1);
            
            if (exitCount < 5) {
                setTimeout(simulateExit, 10);
            } else {
                setTimeout(() => {
                    expect(console.log).toHaveBeenCalledWith('Max restart attempts reached. Exiting.');
                    expect(process.exit).toHaveBeenCalledWith(1);
                    done();
                }, 2100);
            }
        };
        
        setTimeout(simulateExit, 10);
    });

    test('handles server error', () => {
        require('./start.js');
        
        const error = new Error('Server start failed');
        mockProcess.emit('error', error);
        
        expect(console.error).toHaveBeenCalledWith('Failed to start server:', error);
    });

    test('handles SIGINT gracefully', () => {
        require('./start.js');
        
        process.emit('SIGINT');
        
        expect(console.log).toHaveBeenCalledWith('Shutting down...');
        expect(mockProcess.kill).toHaveBeenCalledWith('SIGINT');
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('handles SIGTERM gracefully', () => {
        require('./start.js');
        
        process.emit('SIGTERM');
        
        expect(console.log).toHaveBeenCalledWith('Shutting down...');
        expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('does not restart on clean exit', () => {
        require('./start.js');
        
        mockProcess.emit('exit', 0);
        
        expect(console.log).toHaveBeenCalledWith('Server exited with code 0');
        expect(console.log).not.toHaveBeenCalledWith('Restarting server in 2 seconds...');
    });
});