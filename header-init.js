// Fetch the current user from the server and expose it as `window.currentUser`
// This script should be included before the bundled `dist/header.js` so the
// React header can read `window.currentUser` synchronously on render.
(async function initHeader() {
    try {
        const resp = await fetch('/auth/whoami', { credentials: 'include' });
        if (resp.status === 204) {
            window.currentUser = null;
            return;
        }
        if (!resp.ok) {
            window.currentUser = null;
            return;
        }
        const data = await resp.json();
        window.currentUser = data.user || null;
    } catch (err) {
        // Non-fatal: header can render with Guest fallback
        console.error('header-init: failed to load current user', err);
        window.currentUser = null;
    }
})();
