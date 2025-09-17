// Ad control based on subscription level
async function checkAdVisibility() {
    try {
        // Prefer injected user data when available
        let user = window.currentUser || null;

        // If not injected, call a lightweight endpoint to get current user (uses cookie)
        if (!user) {
            const resp = await fetch('/auth/whoami', { credentials: 'include' });
            const data = await resp.json();
            // normalize: some endpoints return { user: {...} } or the user object directly
            user = data.user || data;
        }

        // If user has premium or full subscription, hide ads
        if (user && (user.subscription === 'premium' || user.subscription === 'full')) {
            document.querySelectorAll('.ad-container, .adsbygoogle').forEach(ad => {
                ad.style.display = 'none';
            });
        }
    } catch (error) {
        // Swallow errors - if check fails, default to showing ads
        console.error('Ad visibility check failed', error);
    }
}

// Check ad visibility on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', checkAdVisibility);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkAdVisibility };
}