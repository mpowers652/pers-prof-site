// Token validation helper
function isTokenExpired(token) {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        return now >= payload.exp || (payload.iat && now < payload.iat);
    } catch (e) {
        return true;
    }
}

// Check if token expires soon (within 10 minutes)
function isTokenExpiringSoon(token) {
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const tenMinutes = 10 * 60 * 1000;
        return Date.now() >= (payload.exp * 1000 - tenMinutes);
    } catch {
        return false;
    }
}

// Verify token is a valid JWT format
function isValidJWT(token) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
        // Verify each part is valid base64
        JSON.parse(atob(parts[0])); // header
        JSON.parse(atob(parts[1])); // payload
        return true;
    } catch {
        return false;
    }
}

// Refresh token if needed
async function refreshTokenIfNeeded() {
    const token = getToken();
    // If no token is available in JS, still attempt refresh using cookie-based session
    if (!token && !isTokenExpiringSoon(null)) return false;

    if (isTokenExpiringSoon(token)) {
        try {
            const fetchOptions = {
                method: 'POST',
                _isAuthRequest: true,
                credentials: 'include'
            };
            if (token) {
                fetchOptions.headers = { 'Authorization': `Bearer ${token}` };
            }
            const response = await fetch('/auth/refresh', fetchOptions);
            
            if (response.ok) {
                const data = await response.json();
                if (isValidJWT(data.token)) {
                    localStorage.setItem('token', data.token);
                    console.log('Token refreshed successfully');
                    return true;
                }
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
    }
    return false;
}

// Get token from cookies
function getCookieToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token') return value;
    }
    return null;
}

// Get token from localStorage, global variable, or cookies
// Get token from localStorage, global variable, or cookies
function getToken() {
    try {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('token');
            if (stored) return stored;
        }
    } catch (e) {
        // ignore access errors
    }
    if (typeof window !== 'undefined' && window.__authToken) return window.__authToken;
    return getCookieToken();
}

// Clear expired token
function clearExpiredToken() {
    try {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('token');
            if (stored && isTokenExpired(stored)) {
                localStorage.removeItem('token');
                localStorage.removeItem('userType');
                return true;
            }
        }
    } catch (e) {
        // ignore
    }

    const token = getToken();
    if (token && isTokenExpired(token)) {
        // clear cookie token
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        return true;
    }
    return false;
}

// Activity tracking for token refresh
let lastActivity = Date.now();
let refreshInterval;

// Track user activity
function trackActivity() {
    lastActivity = Date.now();
}

// Auto-refresh token based on activity
function startTokenRefreshTimer() {
    if (refreshInterval) clearInterval(refreshInterval);
    
    refreshInterval = setInterval(async () => {
        const token = getToken();
        if (!token) return;
        
        // Only refresh if user was active in last 30 minutes
        const thirtyMinutes = 30 * 60 * 1000;
        if (Date.now() - lastActivity < thirtyMinutes) {
            await refreshTokenIfNeeded();
        }
    }, 5 * 60 * 1000); // Check every 5 minutes
}

// Auth response handler
function handleAuthResponse(response) {
    const status = response && response.status;

    // 401 -> not authenticated -> send to login
    if (status === 401) {
        clearExpiredToken();
        return { requiresLogin: true, redirectTo: '/login' };
    }

    // 403 -> authenticated but not authorized -> send to subscription page
    if (status === 403) {
        return { requiresLogin: true, redirectTo: '/subscription' };
    }

    return { requiresLogin: false };
}

// Activity event listeners - always register
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, trackActivity, { passive: true });
});

// Auto-clear expired tokens on page visibility change
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        if (clearExpiredToken()) {
            const authResult = handleAuthResponse({ status: 401 });
            if (authResult.requiresLogin && !window.location.pathname.includes('/login')) {
                window.location.href = authResult.redirectTo;
            }
        } else {
            await refreshTokenIfNeeded();
        }
    }
});

// Start refresh timer if token exists
if (getToken()) {
    startTokenRefreshTimer();
}

// Client-side authentication helper
function setAuthHeaders() {
    clearExpiredToken();
    const token = getToken();
    const userType = localStorage.getItem('userType');
    
    // Prefer cookie-based auth; do not add Authorization header from localStorage.
    if (token && !isTokenExpired(token)) {
        return { 'Authorization': `Bearer ${token}` };
    } else if (userType === 'guest') {
        return { 'X-User-Type': 'guest' };
    }
    
    return {};
}

// Add auth headers to all fetch requests
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    // Skip auth headers for internal auth refresh requests to prevent recursion
    if (!options._isAuthRequest) {
        // Add auth headers if a cookie-based token exists (getToken reads cookies)
        const token = getToken();
        if (token && !isTokenExpired(token)) {
            options.headers = { ...options.headers, ...setAuthHeaders() };
        }
        // Always include credentials to send httpOnly cookies
        options.credentials = options.credentials || 'include';
    }
    return originalFetch(url, options).then(response => {
        const authResult = handleAuthResponse(response);
        if (authResult.requiresLogin && !window.location.pathname.includes('/login')) {
            window.location.href = authResult.redirectTo;
        }
        return response;
    }).catch(error => {
        const authResult = handleAuthResponse(error);
        if (authResult.requiresLogin && !window.location.pathname.includes('/login')) {
            window.location.href = authResult.redirectTo;
        }
        throw error;
    });
};

// Only clear expired tokens on explicit check
// Removed automatic clearing on script load

// Make functions globally available for testing
if (typeof window !== 'undefined') {
    window.isTokenExpired = isTokenExpired;
    window.isTokenExpiringSoon = isTokenExpiringSoon;
    window.isValidJWT = isValidJWT;
    window.getCookieToken = getCookieToken;
    window.getToken = getToken;
    window.clearExpiredToken = clearExpiredToken;
    window.refreshTokenIfNeeded = refreshTokenIfNeeded;
    window.setAuthHeaders = setAuthHeaders;
    window.trackActivity = trackActivity;
    window.startTokenRefreshTimer = startTokenRefreshTimer;
    window.handleAuthResponse = handleAuthResponse;
}

// Make functions globally available for Node.js testing
if (typeof global !== 'undefined') {
    global.isTokenExpired = isTokenExpired;
    global.isTokenExpiringSoon = isTokenExpiringSoon;
    global.isValidJWT = isValidJWT;
    global.getCookieToken = getCookieToken;
    global.getToken = getToken;
    global.clearExpiredToken = clearExpiredToken;
    global.refreshTokenIfNeeded = refreshTokenIfNeeded;
    global.setAuthHeaders = setAuthHeaders;
    global.trackActivity = trackActivity;
    global.startTokenRefreshTimer = startTokenRefreshTimer;
    global.handleAuthResponse = handleAuthResponse;
    
    // Expose variables with getters/setters for testing
    Object.defineProperty(global, 'lastActivity', {
        get: () => lastActivity,
        set: (value) => { lastActivity = value; }
    });
    
    Object.defineProperty(global, 'refreshInterval', {
        get: () => refreshInterval,
        set: (value) => { refreshInterval = value; }
    });
}

// Only start token management if token exists
if (getToken()) {
    startTokenRefreshTimer();
    // Don't call refreshTokenIfNeeded() synchronously during module load
}