const request = require('supertest');
const express = require('express');
const path = require('path');

// Create test app
const app = express();
app.use(express.static('.'));

// FFT Visualizer route
app.get('/fft-visualizer', (req, res) => {
    res.sendFile(path.join(__dirname, 'fft-visualizer.html'));
});

describe('FFT Visualizer Tests', () => {
    test('GET /fft-visualizer should return fft-visualizer.html', async () => {
        const res = await request(app).get('/fft-visualizer');
        expect(res.status).toBe(200);
        expect(res.text).toContain('FFT Audio Visualizer');
    });

    test('FFT visualizer page should contain canvas element', async () => {
        const res = await request(app).get('/fft-visualizer');
        expect(res.text).toContain('<canvas id="canvas"');
    });

    test('FFT visualizer page should contain start button', async () => {
        const res = await request(app).get('/fft-visualizer');
        expect(res.text).toContain('Start Microphone');
    });

    test('FFT visualizer page should contain download controls', async () => {
        const res = await request(app).get('/fft-visualizer');
        expect(res.text).toContain('Audio Only');
        expect(res.text).toContain('FFT Video Only');
        expect(res.text).toContain('Both Audio and Video');
        expect(res.text).toContain('Download Visualization');
    });

    test('FFT visualizer page should contain aspect ratio radio buttons', async () => {
        const res = await request(app).get('/fft-visualizer');
        expect(res.text).toContain('16:9');
        expect(res.text).toContain('9:16');
        expect(res.text).toContain('name="aspectRatio"');
    });
});