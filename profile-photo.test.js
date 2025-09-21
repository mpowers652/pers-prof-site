const { JSDOM } = require('jsdom');

describe('Profile Photo Display', () => {
    let dom, window, document;
    
    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="profile-section" class="profile-section">
                    <div class="profile-picture">
                        <img id="profile-img" class="profile-img" alt="Profile" style="display: none;">
                        <div id="profile-placeholder" class="profile-placeholder">No profile photo</div>
                    </div>
                </div>
                <div id="user-info"></div>
            </body>
            </html>
        `);
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
        
        // Load script functions
        require('./script.js');
        window.currentUser = null;
    });
    
    test('should display Google profile photo when user has one', () => {
        window.currentUser = {
            username: 'testuser',
            role: 'user',
            googlePhoto: 'https://example.com/photo.jpg'
        };
        
        global.updateUserInterface();
        
        const profileImg = document.getElementById('profile-img');
        const profilePlaceholder = document.getElementById('profile-placeholder');
        
        expect(profileImg.src).toBe('https://example.com/photo.jpg');
        expect(profileImg.style.display).toBe('block');
        expect(profilePlaceholder.style.display).toBe('none');
    });
    
    test('should display Facebook profile photo when user has one', () => {
        window.currentUser = {
            username: 'testuser',
            role: 'user',
            facebookPhoto: 'https://facebook.com/photo.jpg'
        };
        
        global.updateUserInterface();
        
        const profileImg = document.getElementById('profile-img');
        const profilePlaceholder = document.getElementById('profile-placeholder');
        
        expect(profileImg.src).toBe('https://facebook.com/photo.jpg');
        expect(profileImg.style.display).toBe('block');
        expect(profilePlaceholder.style.display).toBe('none');
    });
    
    test('should show placeholder when user has no profile photo', () => {
        window.currentUser = {
            username: 'testuser',
            role: 'user'
        };
        
        global.updateUserInterface();
        
        const profileImg = document.getElementById('profile-img');
        const profilePlaceholder = document.getElementById('profile-placeholder');
        
        expect(profileImg.style.display).toBe('none');
        expect(profilePlaceholder.style.display).toBe('block');
    });
    
    test('should show placeholder when no user is logged in', () => {
        window.currentUser = null;
        
        global.updateUserInterface();
        
        const profileImg = document.getElementById('profile-img');
        const profilePlaceholder = document.getElementById('profile-placeholder');
        
        expect(profileImg.style.display).toBe('none');
        expect(profilePlaceholder.style.display).toBe('block');
    });
});