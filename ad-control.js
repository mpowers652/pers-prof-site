// Ad control based on subscription level
async function checkAdVisibility() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    // Show ads for guests and users without tokens
    if (userType === 'guest' || !token) return;
    
    try {
        const response = await fetch('/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.user && data.user.hideAds) {
            // Hide all AdSense ads
            document.querySelectorAll('.ad-container, .adsbygoogle').forEach(ad => {
                ad.style.display = 'none';
            });
        }
    } catch (error) {
        console.log('Ad visibility check failed');
        console.error(error);
    }
}

// Check ad visibility on page load
window.addEventListener('load', checkAdVisibility);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkAdVisibility };
}