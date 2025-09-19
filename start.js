const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess;
let restartCount = 0;
const MAX_RESTARTS = 5;

function startServer() {
    console.log(`Starting server (attempt ${restartCount + 1})`);
    console.log('Current directory:', __dirname);
    console.log('Checking if server.js exists:', fs.existsSync(path.join(__dirname, 'server.js')));
    
    serverProcess = spawn('node', ['server.js'], {
        stdio: 'inherit',
        cwd: __dirname,
        env: { ...process.env, NODE_ENV: 'production' }
    });
    
    if (serverProcess) {
        serverProcess.on('exit', (code) => {
            console.log(`Server exited with code ${code}`);
            
            if (code !== 0 && restartCount < MAX_RESTARTS) {
                restartCount++;
                console.log(`Restarting server in 2 seconds...`);
                setTimeout(startServer, 2000);
            } else if (restartCount >= MAX_RESTARTS) {
                console.log('Max restart attempts reached. Exiting.');
                process.exit(1);
            }
        });
        
        serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
        console.error('Error stack:', err.stack);
    });
    
    // Add additional error handling for uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        console.error('Error stack:', err.stack);
        if (serverProcess) {
            serverProcess.kill();
        }
        process.exit(1);
    });
    }
    
    return serverProcess;
}

function resetRestartCount() {
    restartCount = 0;
}

function getServerProcess() {
    return serverProcess;
}

// Handle graceful shutdown
function handleSIGINT() {
    console.log('Shutting down...');
    if (serverProcess) {
        serverProcess.kill('SIGINT');
    }
    process.exit(0);
}

function handleSIGTERM() {
    console.log('Shutting down...');
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }
    process.exit(0);
}

process.on('SIGINT', handleSIGINT);
process.on('SIGTERM', handleSIGTERM);

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

// Additional signal handling for production
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in development, but do in production
    if (process.env.NODE_ENV === 'production') {
        if (serverProcess) {
            serverProcess.kill();
        }
        process.exit(1);
    }
});

// Handle system signals
process.on('SIGUSR1', () => {
    console.log('SIGUSR1 signal received...');
    if (serverProcess) {
        serverProcess.kill('SIGUSR1');
    }
});

process.on('SIGUSR2', () => {
    console.log('SIGUSR2 signal received...');
    if (serverProcess) {
        serverProcess.kill('SIGUSR2');
    }
});

// Export for testing
module.exports = { 
    startServer, 
    resetRestartCount, 
    getServerProcess,
    handleSIGINT,
    handleSIGTERM
};