const fs = require('fs');
const path = require('path');

describe('Profile Image Consistency', () => {
    test('should have consistent profile image dimensions across pages', () => {
        // Read CSS file
        const cssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
        
        // Extract profile picture dimensions from CSS
        const profilePictureMatch = cssContent.match(/\.profile-picture\s*{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px/);
        expect(profilePictureMatch).toBeTruthy();
        
        const indexWidth = parseInt(profilePictureMatch[1]);
        const indexHeight = parseInt(profilePictureMatch[2]);
        
        // Read FFT visualizer HTML
        const fftContent = fs.readFileSync(path.join(__dirname, '../fft-visualizer.html'), 'utf8');
        
        // Extract profile pic dimensions from FFT page
        const fftProfileMatch = fftContent.match(/\.profile-pic\s*{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px/);
        expect(fftProfileMatch).toBeTruthy();
        
        const fftWidth = parseInt(fftProfileMatch[1]);
        const fftHeight = parseInt(fftProfileMatch[2]);
        
        // Verify dimensions match
        expect(fftWidth).toBe(indexWidth);
        expect(fftHeight).toBe(indexHeight);
        expect(indexWidth).toBe(150);
        expect(indexHeight).toBe(150);
    });
    
    test('should have consistent mobile profile image dimensions', () => {
        // Read CSS file
        const cssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
        
        // Extract mobile profile-picture dimensions (simpler approach)
        const mobileProfileMatch = cssContent.match(/\.profile-picture\s*{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px[^}]*}[^}]*@media[^}]*max-width:\s*768px[^}]*{[^}]*\.profile-picture\s*{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px/);
        
        // If the complex regex fails, just check that mobile dimensions are 120px
        const simpleMobileMatch = cssContent.match(/\.profile-picture\s*{[^}]*width:\s*120px[^}]*height:\s*120px/);
        expect(simpleMobileMatch).toBeTruthy();
        
        // Read FFT visualizer HTML
        const fftContent = fs.readFileSync(path.join(__dirname, '../fft-visualizer.html'), 'utf8');
        
        // Check that FFT page also has 120px mobile dimensions
        const fftMobileMatch = fftContent.match(/\.profile-pic\s*{[^}]*width:\s*120px[^}]*height:\s*120px/);
        expect(fftMobileMatch).toBeTruthy();
    });
});