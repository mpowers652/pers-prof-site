// Client-side authentication helper
function setAuthHeaders() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (token) {
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
    return originalFetch(url, options);
};

// Check auth on page load
if (!localStorage.getItem('token') && localStorage.getItem('userType') !== 'guest' && 
    !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
    window.location.href = '/login';
}