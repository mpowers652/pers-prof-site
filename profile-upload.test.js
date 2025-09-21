const { JSDOM } = require('jsdom');

describe('Profile Photo Upload', () => {
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
                    <input type="file" id="profile-upload" class="file-input" accept="image/*">
                    <button id="upload-btn" class="btn">Upload Photo</button>
                    <button id="remove-btn" class="btn" style="display: none;">Remove Photo</button>
                </div>
            </body>
            </html>
        `);
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
        
        // Mock localStorage
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
        };
        global.localStorage = localStorageMock;
        
        // Load script functions
        require('./script.js');
        window.currentUser = { username: 'testuser', role: 'user' };
    });
    
    test('should show remove button when user has custom photo', () => {
        window.currentUser.customPhoto = 'data:image/png;base64,test';
        
        global.updateUserInterface();
        
        const profileImg = document.getElementById('profile-img');
        const profilePlaceholder = document.getElementById('profile-placeholder');
        const removeBtn = document.getElementById('remove-btn');
        
        expect(profileImg.src).toBe('data:image/png;base64,test');
        expect(profileImg.style.display).toBe('block');
        expect(profilePlaceholder.style.display).toBe('none');
        expect(removeBtn.style.display).toBe('inline-block');
    });
    
    test('should hide remove button when user has no custom photo', () => {
        global.updateUserInterface();
        
        const removeBtn = document.getElementById('remove-btn');
        expect(removeBtn.style.display).toBe('none');
    });
    
    test('should remove custom photo when removeProfilePhoto is called', () => {
        window.currentUser.customPhoto = 'data:image/png;base64,test';
        
        global.removeProfilePhoto();
        
        expect(window.currentUser.customPhoto).toBeUndefined();
        expect(localStorage.removeItem).toHaveBeenCalledWith('customProfilePhoto');
    });
    
    test('should prioritize custom photo over OAuth photos', () => {
        window.currentUser.googlePhoto = 'https://google.com/photo.jpg';
        window.currentUser.customPhoto = 'data:image/png;base64,custom';
        
        global.updateUserInterface();
        
        const profileImg = document.getElementById('profile-img');
        expect(profileImg.src).toBe('data:image/png;base64,custom');
    });
});