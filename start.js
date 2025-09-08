const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess;
let restartCount = 0;
const MAX_RESTARTS = 5;

function startServer() {
    console.log(`Starting server (attempt ${restartCount + 1})`);
    
    serverProcess = spawn('node', ['server.js'], {
        stdio: 'inherit',
        cwd: __dirname
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

// Export for testing
module.exports = { 
    startServer, 
    resetRestartCount, 
    getServerProcess,
    handleSIGINT,
    handleSIGTERM
};