const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('FFT Visualizer Story Generator Integration', () => {
    let dom, window, document;
    
    beforeEach(() => {
        const html = fs.readFileSync(path.join(__dirname, 'fft-visualizer.html'), 'utf8');
        dom = new JSDOM(html, { 
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true
        });
        window = dom.window;
        document = window.document;
        
        // Mock fetch
        global.fetch = jest.fn();
        window.fetch = global.fetch;
        
        // Mock localStorage
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        };
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });

    test('story section should be hidden by default', () => {
        const storySection = document.getElementById('storySection');
        expect(storySection).toBeTruthy();
        expect(storySection.classList.contains('hidden')).toBe(true);
    });

    test('story section should contain all required elements', () => {
        const storySection = document.getElementById('storySection');
        expect(storySection.querySelector('#adjective')).toBeTruthy();
        expect(storySection.querySelector('#wordCount')).toBeTruthy();
        expect(storySection.querySelector('#subject')).toBeTruthy();
        expect(storySection.querySelector('#customAdjective')).toBeTruthy();
        expect(storySection.querySelector('#customWordCount')).toBeTruthy();
        expect(storySection.querySelector('#customSubject')).toBeTruthy();
        expect(storySection.querySelector('#story-display')).toBeTruthy();
    });

    test('hasFullAccess should return true for admin users', () => {
        const adminUser = { role: 'admin', subscription: 'basic' };
        expect(window.hasFullAccess(adminUser)).toBe(true);
    });

    test('hasFullAccess should return true for full subscription users', () => {
        const fullUser = { role: 'user', subscription: 'full' };
        expect(window.hasFullAccess(fullUser)).toBe(true);
    });

    test('hasFullAccess should return false for basic users', () => {
        const basicUser = { role: 'user', subscription: 'basic' };
        expect(window.hasFullAccess(basicUser)).toBe(false);
    });

    test('toggleStorySection should show story section for authorized users', () => {
        const storySection = document.getElementById('storySection');
        window.toggleStorySection(true);
        expect(storySection.classList.contains('hidden')).toBe(false);
    });

    test('toggleStorySection should hide story section for unauthorized users', () => {
        const storySection = document.getElementById('storySection');
        window.toggleStorySection(false);
        expect(storySection.classList.contains('hidden')).toBe(true);
    });

    test('checkSubscription should show story section when currentUser has full access', async () => {
        window.currentUser = { role: 'admin', subscription: 'basic' };
        await window.checkSubscription();
        
        const storySection = document.getElementById('storySection');
        expect(storySection.classList.contains('hidden')).toBe(false);
    });

    test('checkSubscription should hide story section when currentUser lacks access', async () => {
        window.currentUser = { role: 'user', subscription: 'basic' };
        await window.checkSubscription();
        
        const storySection = document.getElementById('storySection');
        expect(storySection.classList.contains('hidden')).toBe(true);
    });

    test('checkSubscription should verify with cookie when no currentUser', async () => {
        window.currentUser = null;
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ user: { role: 'admin' } })
        });
        
        await window.checkSubscription();
        
        expect(global.fetch).toHaveBeenCalledWith('/auth/verify', {
            credentials: 'include',
            _suppressAuthRedirect: true
        });
        
        const storySection = document.getElementById('storySection');
        expect(storySection.classList.contains('hidden')).toBe(false);
    });

    test('checkSubscription should verify with token when cookie fails', async () => {
        window.currentUser = null;
        window.localStorage.getItem.mockReturnValue('test-token');
        
        global.fetch
            .mockRejectedValueOnce(new Error('Cookie failed'))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ user: { subscription: 'full' } })
            });
        
        await window.checkSubscription();
        
        expect(global.fetch).toHaveBeenCalledWith('/auth/verify', {
            headers: { 'Authorization': 'Bearer test-token' },
            _suppressAuthRedirect: true
        });
        
        const storySection = document.getElementById('storySection');
        expect(storySection.classList.contains('hidden')).toBe(false);
    });

    test('generateStory should require login', async () => {
        window.localStorage.getItem.mockReturnValue(null);
        window.alert = jest.fn();
        
        await window.generateStory();
        
        expect(window.alert).toHaveBeenCalledWith('Please log in to generate stories');
    });

    test('generateStory should require all fields', async () => {
        window.localStorage.getItem.mockReturnValue('test-token');
        window.alert = jest.fn();
        
        // Mock empty form values
        document.getElementById('adjective').value = '';
        document.getElementById('wordCount').value = '';
        document.getElementById('subject').value = '';
        
        await window.generateStory();
        
        expect(window.alert).toHaveBeenCalledWith('Please fill in all fields');
    });

    test('generateStory function should exist and be callable', () => {
        expect(typeof window.generateStory).toBe('function');
        
        // Verify the function exists in the global scope
        const scriptContent = document.documentElement.innerHTML;
        expect(scriptContent).toContain('function generateStory()');
        expect(scriptContent).toContain('/story/generate');
    });

    test('updateSubjects should populate scary subjects for scary adjective', () => {
        document.getElementById('adjective').value = 'scary';
        window.updateSubjects();
        
        const subjectSelect = document.getElementById('subject');
        expect(subjectSelect.innerHTML).toContain('urban legends');
        expect(subjectSelect.innerHTML).toContain('werewolves');
    });

    test('updateSubjects should populate other subjects for non-scary adjective', () => {
        document.getElementById('adjective').value = 'funny';
        window.updateSubjects();
        
        const subjectSelect = document.getElementById('subject');
        expect(subjectSelect.innerHTML).toContain('puppies');
        expect(subjectSelect.innerHTML).toContain('kitties');
    });

    test('story section should listen for auth updates', () => {
        const mockCheckSubscription = jest.fn();
        window.checkSubscription = mockCheckSubscription;
        
        window.dispatchEvent(new window.Event('auth:updated'));
        
        expect(mockCheckSubscription).toHaveBeenCalled();
    });
});