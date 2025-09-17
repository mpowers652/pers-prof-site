// User authentication and service management
let currentUser = null;

// Initialize the application
// Run initialization immediately so tests that `require('./script.js')` execute handlers
try {
    checkAuthentication();
} catch (e) {
    // In test env, DOM may be mocked — ignore
}
try {
    initializeNavigation();
} catch (e) {
    // In test env, DOM may be mocked — ignore
}

// Check user authentication status
function checkAuthentication() {
    // Use injected user data from server
    if (window.currentUser) {
        currentUser = window.currentUser;
        updateUserInterface();
    } else {
        // Fallback to API call if no injected data
        const token = localStorage.getItem('token') || getCookie('token');
        if (!token) {
            // In test environments jsdom doesn't implement navigation; fallback to no-op
            if (typeof window !== 'undefined' && window.location && typeof window.location.href !== 'undefined') {
                try { window.location.href = '/login'; } catch (e) { /* ignore jsdom navigation */ }
            }
            return;
        }
        
        fetch('/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Authentication failed');
            }
        })
        .then(data => {
            currentUser = data.user;
            updateUserInterface();
        })
        .catch(error => {
            console.error('Authentication check failed:', error);
            localStorage.removeItem('token');
            try { window.location.href = '/login'; } catch (e) { /* ignore jsdom navigation */ }
        });
    }
}

// Update user interface based on authentication
function updateUserInterface() {
    const userInfo = document.getElementById('user-info');
    if (currentUser && userInfo) {
        userInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                ${currentUser.googlePhoto ? `<img src="${currentUser.googlePhoto}" alt="Profile" style="width: 30px; height: 30px; border-radius: 50%;">` : ''}
                <span>Welcome, ${currentUser.username}!</span>
                <span class="role-badge">${currentUser.role}</span>
            </div>
        `;
    }
}

// Check story generator access
function checkStoryAccess() {
    if (!currentUser) {
        alert('Please log in to access this service.');
        return;
    }
    
    console.log('Story access check:', currentUser);
    
    if (currentUser.subscription === 'full' || currentUser.role === 'admin') {
        try { window.location.href = '/story-generator'; } catch (e) { /* ignore jsdom navigation */ }
    } else {
        alert(`Story Generator requires a full subscription. Your current level: ${currentUser.subscription || 'basic'} (Role: ${currentUser.role || 'user'})`);
    }
}

// Smooth scrolling for navigation links
function initializeNavigation() {
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    navLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Simple service status checker
function checkServiceStatus(serviceUrl) {
    return fetch(serviceUrl)
        .then(response => response.ok)
        .catch(() => false);
}

// Add service dynamically
function addService(name, description, url) {
    // Tests expect selector '.service-grid' (singular)
    const serviceGrid = document.querySelector('.service-grid') || document.querySelector('.services-grid');
    if (!serviceGrid) return;
    
    const serviceCard = document.createElement('div');
    serviceCard.className = 'service-card';
    serviceCard.innerHTML = `
        <h3>${name}</h3>
        <p>${description}</p>
        <a class="service-link" href="${url}">${url}</a>
    `;
    serviceCard.onclick = () => {
        try { window.location.href = url; } catch (e) { /* ignore jsdom navigation */ }
    };
    serviceGrid.appendChild(serviceCard);
    // Also add to dropdown menu if present
    const dropdownMenu = document.querySelector('.dropdown-menu');
    if (dropdownMenu) {
        const menuItem = document.createElement('li');
        menuItem.innerHTML = `<a href="${url}">${name} - ${url}</a>`;
        dropdownMenu.appendChild(menuItem);
    }
}

// Utility function to get cookie value
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Expose functions globally for testing
if (typeof global !== 'undefined') {
    global.checkServiceStatus = checkServiceStatus;
    global.addService = addService;
    global.checkStoryAccess = checkStoryAccess;
}