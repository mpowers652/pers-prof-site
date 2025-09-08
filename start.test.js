const EventEmitter = require('events');

// Create a mock for child_process before requiring anything
const mockSpawn = jest.fn();
const mockProcess = new EventEmitter();
mockProcess.kill = jest.fn();

jest.doMock('child_process', () => ({
    spawn: mockSpawn
}));

describe('Start Module', () => {
    let originalExit;
    let originalConsoleLog;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        // Reset mock process
        mockProcess.removeAllListeners();
        mockProcess.kill.mockClear();
        mockSpawn.mockReturnValue(mockProcess);
        
        originalExit = process.exit;
        originalConsoleLog = console.log;
        process.exit = jest.fn();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        process.exit = originalExit;
        console.log = originalConsoleLog;
    });

    test('starts server successfully', () => {
        const { startServer } = require('./start.js');
        startServer();
        
        expect(mockSpawn).toHaveBeenCalledWith('node', ['server.js'], {
            stdio: 'inherit',
            cwd: expect.any(String)
        });
        expect(console.log).toHaveBeenCalledWith('Starting server (attempt 1)');
    });

    test('handles server error', () => {
        const { startServer } = require('./start.js');
        startServer();
        
        const error = new Error('Server start failed');
        mockProcess.emit('error', error);
        
        expect(console.error).toHaveBeenCalledWith('Failed to start server:', error);
    });

    test('handles SIGINT gracefully', () => {
        const { startServer, handleSIGINT } = require('./start.js');
        startServer();
        
        handleSIGINT();
        
        expect(console.log).toHaveBeenCalledWith('Shutting down...');
        expect(mockProcess.kill).toHaveBeenCalledWith('SIGINT');
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('handles SIGTERM gracefully', () => {
        const { startServer, handleSIGTERM } = require('./start.js');
        startServer();
        
        handleSIGTERM();
        
        expect(console.log).toHaveBeenCalledWith('Shutting down...');
        expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('logs server exit', () => {
        const { startServer } = require('./start.js');
        startServer();
        
        mockProcess.emit('exit', 0);
        
        expect(console.log).toHaveBeenCalledWith('Server exited with code 0');
    });

    test('restarts on non-zero exit', () => {
        const { startServer } = require('./start.js');
        
        startServer();
        mockProcess.emit('exit', 1);
        
        expect(console.log).toHaveBeenCalledWith('Server exited with code 1');
        expect(console.log).toHaveBeenCalledWith('Restarting server in 2 seconds...');
    });

    test('exits after max restarts', () => {
        const { startServer } = require('./start.js');
        
        // Simulate reaching max restarts by calling startServer multiple times
        // and emitting exit events
        for (let i = 0; i < 5; i++) {
            startServer();
            mockProcess.emit('exit', 1);
        }
        
        // The next exit should trigger max restart message
        mockProcess.emit('exit', 1);
        
        expect(console.log).toHaveBeenCalledWith('Max restart attempts reached. Exiting.');
        expect(process.exit).toHaveBeenCalledWith(1);
    });
});