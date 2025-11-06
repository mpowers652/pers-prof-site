/**
 * @jest-environment jsdom
 */

describe('Profile AI Credits Section', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="profile-content"></div>';
        global.fetch = jest.fn();
    });

    test('should display AI credits for user with credits', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    subscription: 'premium',
                    aiCredits: 500,
                    openaiKey: 'sk-test-key'
                }
            })
        });

        const loadProfile = async () => {
            const response = await fetch('/auth/verify', { credentials: 'include' });
            const data = await response.json();
            const user = data.user || data;
            
            document.getElementById('profile-content').innerHTML = `
                <div class="ai-credits">
                    <h4>AI Credits</h4>
                    <div class="credits-amount">${user.aiCredits || 0}</div>
                    <div class="credits-label">Available Credits</div>
                    ${!user.openaiKey ? '<a href="/request-api-key">Request AI Access</a>' : '<div>✓ AI Access Enabled</div>'}
                </div>
            `;
        };

        await loadProfile();

        expect(document.querySelector('.credits-amount').textContent).toBe('500');
        expect(document.body.textContent).toContain('AI Access Enabled');
    });

    test('should show request AI access button for user without API key', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    subscription: 'basic',
                    aiCredits: 100,
                    openaiKey: null
                }
            })
        });

        const loadProfile = async () => {
            const response = await fetch('/auth/verify', { credentials: 'include' });
            const data = await response.json();
            const user = data.user || data;
            
            document.getElementById('profile-content').innerHTML = `
                <div class="ai-credits">
                    <h4>AI Credits</h4>
                    <div class="credits-amount">${user.aiCredits || 0}</div>
                    ${!user.openaiKey ? '<a href="/request-api-key">Request AI Access</a>' : '<div>✓ AI Access Enabled</div>'}
                </div>
            `;
        };

        await loadProfile();

        expect(document.querySelector('.credits-amount').textContent).toBe('100');
        expect(document.body.textContent).toContain('Request AI Access');
        expect(document.body.textContent).not.toContain('AI Access Enabled');
    });

    test('should display 0 credits when user has no credits', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    subscription: 'basic',
                    aiCredits: 0
                }
            })
        });

        const loadProfile = async () => {
            const response = await fetch('/auth/verify', { credentials: 'include' });
            const data = await response.json();
            const user = data.user || data;
            
            document.getElementById('profile-content').innerHTML = `
                <div class="credits-amount">${user.aiCredits || 0}</div>
            `;
        };

        await loadProfile();

        expect(document.querySelector('.credits-amount').textContent).toBe('0');
    });
});