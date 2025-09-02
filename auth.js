// Token validation helper
function isTokenExpired(token) {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        console.log('Token validation - now:', now, 'exp:', payload.exp, 'iat:', payload.iat);
        console.log('Checks - expired:', now >= payload.exp, 'future iat:', payload.iat && now < payload.iat);
        return now >= payload.exp || (payload.iat && now < payload.iat);
    } catch (e) {
        console.log('Token parsing error:', e);
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
    if (!token || isTokenExpired(token)) return false;
    
    if (isTokenExpiringSoon(token)) {
        try {
            const response = await fetch('/auth/refresh', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
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
function getToken() {
    return localStorage.getItem('token') || window.__authToken || getCookieToken();
}

// Clear expired token
function clearExpiredToken() {
    const token = getToken();
    if (token && isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
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

// Activity event listeners
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, trackActivity, { passive: true });
});

// Auto-clear expired tokens on page visibility change
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        if (clearExpiredToken()) {
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
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
    refreshTokenIfNeeded();
    const token = getToken();
    const userType = localStorage.getItem('userType');
    
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
    options.headers = { ...options.headers, ...setAuthHeaders() };
    return originalFetch(url, options).catch(error => {
        if (error.status === 401) {
            clearExpiredToken();
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        throw error;
    });
};

// Only clear expired tokens on explicit check
// Removed automatic clearing on script load

// Only start token management if token exists
if (getToken()) {
    startTokenRefreshTimer();
    refreshTokenIfNeeded();
}