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

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (serverProcess) {
        serverProcess.kill('SIGINT');
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down...');
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }
    process.exit(0);
});

startServer();