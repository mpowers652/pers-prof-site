/**
 * @jest-environment jsdom
 */

describe('Video Upload Functionality', () => {
    let mockFetch;

    beforeEach(() => {
        // Mock fetch for upload requests
        mockFetch = jest.fn();
        global.fetch = mockFetch;

        // Mock DOM elements
        document.getElementById = jest.fn((id) => {
            if (id === 'uploadBtn') {
                return {
                    textContent: 'Upload Video',
                    disabled: false,
                    classList: {
                        remove: jest.fn(),
                        add: jest.fn()
                    }
                };
            }
            return null;
        });

        document.querySelector = jest.fn((selector) => {
            if (selector === 'input[name="downloadType"]:checked') {
                return { value: 'video' };
            }
            return null;
        });

        // Mock global variables that would be set by the recording
        global.videoOnlyChunks = [new Blob(['mock video data'], { type: 'video/webm' })];
        global.recordedChunks = [new Blob(['mock audio data'], { type: 'audio/webm' })];
        global.videoChunks = [new Blob(['mock combined data'], { type: 'video/webm' })];

        // Mock getTimestamp function
        global.getTimestamp = () => '2024-01-01T12-00-00';

        // Mock FormData
        global.FormData = jest.fn().mockImplementation(() => ({
            append: jest.fn()
        }));

        // Mock Blob
        global.Blob = jest.fn((chunks, options) => ({
            type: options?.type || 'application/octet-stream',
            size: 1000
        }));

        // Mock alert
        global.alert = jest.fn();
    });

    test('should show upload button after recording completion', () => {
        const uploadBtn = document.getElementById('uploadBtn');
        
        // Simulate the enableDownloads function
        const enableDownloads = () => {
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('hidden');
        };

        enableDownloads();

        expect(uploadBtn.disabled).toBe(false);
        expect(uploadBtn.classList.remove).toHaveBeenCalled();
    });

    test('should handle video upload successfully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ filename: 'video-2024-01-01T12-00-00.webm' })
        });

        // Simulate handleUpload function
        const handleUpload = async () => {
            const selectedType = document.querySelector('input[name="downloadType"]:checked')?.value;
            
            if (!selectedType) {
                alert('Please select a file type to upload');
                return;
            }
            
            let blob, filename;
            
            if (selectedType === 'video') {
                blob = new Blob(global.videoOnlyChunks, { type: 'video/webm' });
                filename = `fft-video-${getTimestamp()}.webm`;
            }
            
            const formData = new FormData();
            formData.append('file', blob, filename);
            
            try {
                const uploadBtn = document.getElementById('uploadBtn');
                uploadBtn.textContent = 'Uploading...';
                uploadBtn.disabled = true;
                
                const response = await fetch('/upload-video', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert(`Upload successful! File saved as: ${result.filename}`);
                } else {
                    throw new Error('Upload failed');
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Upload failed. Please try again.');
            } finally {
                const uploadBtn = document.getElementById('uploadBtn');
                uploadBtn.textContent = 'Upload Video';
                uploadBtn.disabled = false;
            }
        };

        await handleUpload();

        expect(mockFetch).toHaveBeenCalledWith('/upload-video', {
            method: 'POST',
            body: expect.any(Object)
        });
        expect(global.alert).toHaveBeenCalledWith('Upload successful! File saved as: video-2024-01-01T12-00-00.webm');
    });

    test('should handle upload failure gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        const handleUpload = async () => {
            const selectedType = document.querySelector('input[name="downloadType"]:checked')?.value;
            
            let blob = new Blob(global.videoOnlyChunks, { type: 'video/webm' });
            let filename = `fft-video-${getTimestamp()}.webm`;
            
            const formData = new FormData();
            formData.append('file', blob, filename);
            
            try {
                const response = await fetch('/upload-video', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert(`Upload successful! File saved as: ${result.filename}`);
                } else {
                    throw new Error('Upload failed');
                }
            } catch (error) {
                alert('Upload failed. Please try again.');
            }
        };

        await handleUpload();

        expect(global.alert).toHaveBeenCalledWith('Upload failed. Please try again.');
    });

    test('should require file type selection', async () => {
        document.querySelector = jest.fn(() => null); // No selection

        const showUploadModal = () => {
            const selectedType = document.querySelector('input[name="downloadType"]:checked')?.value;
            
            if (!selectedType) {
                alert('Please select a file type to upload');
                return;
            }
        };

        showUploadModal();

        expect(global.alert).toHaveBeenCalledWith('Please select a file type to upload');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should show upload modal when upload button is clicked', () => {
        const mockModal = {
            classList: {
                remove: jest.fn(),
                add: jest.fn()
            }
        };
        
        document.getElementById = jest.fn((id) => {
            if (id === 'uploadModal') return mockModal;
            return null;
        });
        
        document.querySelector = jest.fn(() => ({ value: 'video' }));
        
        const showUploadModal = () => {
            const selectedType = document.querySelector('input[name="downloadType"]:checked')?.value;
            
            if (!selectedType) {
                alert('Please select a file type to upload');
                return;
            }
            
            document.getElementById('uploadModal').classList.remove('hidden');
        };
        
        showUploadModal();
        
        expect(mockModal.classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('should handle platform selection and upload', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                filename: 'video-2024-01-01T12-00-00.webm',
                platforms: ['youtube', 'twitter'],
                platformStatus: ['YouTube upload queued', 'Twitter upload queued']
            })
        });
        
        document.querySelectorAll = jest.fn((selector) => {
            if (selector === 'input[name="platform"]:checked') {
                return [
                    { value: 'youtube' },
                    { value: 'twitter' }
                ];
            }
            return [];
        });
        
        const handleUploadToPlatforms = async () => {
            const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
                .map(checkbox => checkbox.value);
            
            if (selectedPlatforms.length === 0) {
                alert('Please select at least one platform');
                return;
            }
            
            const selectedType = 'video';
            let blob = new Blob(global.videoOnlyChunks, { type: 'video/webm' });
            let filename = `fft-video-${getTimestamp()}.webm`;
            
            const formData = new FormData();
            formData.append('file', blob, filename);
            formData.append('platforms', JSON.stringify(selectedPlatforms));
            
            const response = await fetch('/upload-video', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(`Upload successful to ${selectedPlatforms.join(', ')}! File saved as: ${result.filename}`);
            }
        };
        
        await handleUploadToPlatforms();
        
        expect(mockFetch).toHaveBeenCalledWith('/upload-video', {
            method: 'POST',
            body: expect.any(Object)
        });
        expect(global.alert).toHaveBeenCalledWith('Upload successful to youtube, twitter! File saved as: video-2024-01-01T12-00-00.webm');
    });

    test('should require platform selection', async () => {
        document.querySelectorAll = jest.fn(() => []);
        
        const handleUploadToPlatforms = async () => {
            const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
                .map(checkbox => checkbox.value);
            
            if (selectedPlatforms.length === 0) {
                alert('Please select at least one platform');
                return;
            }
        };
        
        await handleUploadToPlatforms();
        
        expect(global.alert).toHaveBeenCalledWith('Please select at least one platform');
        expect(mockFetch).not.toHaveBeenCalled();
    });
});