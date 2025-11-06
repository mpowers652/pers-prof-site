const request = require('supertest');
const app = require('./server');

describe('Video Upload Integration', () => {
    test('should handle video upload with platform selection', async () => {
        const mockVideoData = Buffer.from('mock video data');
        const platforms = ['youtube', 'twitter'];
        
        const response = await request(app)
            .post('/upload-video')
            .attach('file', mockVideoData, 'test-video.webm')
            .field('platforms', JSON.stringify(platforms))
            .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.filename).toContain('test-video.webm');
        expect(response.body.platforms).toEqual(platforms);
        expect(response.body.platformStatus).toHaveLength(2);
        expect(response.body.platformStatus[0]).toContain('YouTube');
        expect(response.body.platformStatus[1]).toContain('Twitter');
    });
    
    test('should handle upload without platform selection', async () => {
        const mockVideoData = Buffer.from('mock video data');
        
        const response = await request(app)
            .post('/upload-video')
            .attach('file', mockVideoData, 'test-video.webm')
            .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.platforms).toEqual([]);
    });
    
    test('should return error when no file is uploaded', async () => {
        const response = await request(app)
            .post('/upload-video')
            .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('No file uploaded');
    });
});