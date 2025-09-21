// Fetch the current user from the server and expose it as `window.currentUser`
// This script should be included before the bundled `dist/header.js` so the
// React header can read `window.currentUser` synchronously on render.
(function initHeader() {
    // Try to synchronously fetch the current user so the header bundle can
    // read `window.currentUser` during initial render. If the sync XHR is
    // blocked or fails, fall back to an async fetch that sets `window.currentUser`.
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/auth/whoami', false); // false = synchronous
        xhr.withCredentials = true;
        xhr.send(null);

        if (xhr.status === 204) {
            window.currentUser = null;
            return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const data = JSON.parse(xhr.responseText);
                // Accept either { user: { ... } } or the user object directly
                const user = data?.user ?? (data?.username ? data : null);
                window.currentUser = user;
            } catch (parseErr) {
                console.debug('header-init: failed to parse whoami response', parseErr);
                window.currentUser = null;
            }
            return;
        }

        window.currentUser = null;
    } catch (err) {
        // If synchronous XHR fails (e.g. blocked in some environments),
        // fall back to an async fetch to populate window.currentUser.
        (async function() {
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
                const user = data?.user ?? (data?.username ? data : null);
                window.currentUser = user;
            } catch (fetchErr) {
                // Non-fatal: header can render with Guest fallback. Log for visibility.
                // Avoid throwing so page render is not blocked.
                console.debug('header-init: async whoami failed', fetchErr);
        window.currentUser = null;
            }
        })();
    }
})();
