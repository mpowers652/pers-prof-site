// User authentication and service management
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeNavigation();
});

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
            window.location.href = '/login';
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
            window.location.href = '/login';
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
        window.location.href = '/story-generator';
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
    const serviceGrid = document.querySelector('.services-grid');
    if (!serviceGrid) return;
    
    const serviceCard = document.createElement('div');
    serviceCard.className = 'service-card';
    serviceCard.innerHTML = `
        <h3>${name}</h3>
        <p>${description}</p>
    `;
    serviceCard.onclick = () => window.location.href = url;
    serviceGrid.appendChild(serviceCard);
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