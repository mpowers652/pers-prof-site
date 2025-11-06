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
try {
    initializeServices();
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
        const token = localStorage.getItem('token');

        // If no JS token present, attempt cookie/session-based verify first so
        // that httpOnly cookies set by the server are honored. Only redirect to
        // /login if verify fails.
        if (!token) {
            fetch('/auth/verify', { credentials: 'include', _suppressAuthRedirect: true })
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('No session');
            })
            .then(data => {
                currentUser = data.user || data;
                updateUserInterface();
            })
            .catch(() => {
                // No session cookie either, redirect to login
                try { window.location.href = '/login'; } catch (e) { /* ignore jsdom navigation */ }
            });
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
    console.log('Updating UI with user:', currentUser);
    
    const userInfo = document.getElementById('user-info');
    if (currentUser && userInfo) {
        let headerPhotoUrl = currentUser.googlePhoto;
        if (headerPhotoUrl && headerPhotoUrl.includes('googleusercontent.com')) {
            headerPhotoUrl = `/proxy/image?url=${encodeURIComponent(headerPhotoUrl)}`;
        }
        
        userInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                ${headerPhotoUrl ? `<img src="${headerPhotoUrl}" alt="Profile" style="width: 30px; height: 30px; border-radius: 50%;">` : ''}
                <span>Welcome, ${currentUser.username}!</span>
                <span class="role-badge">${currentUser.role}</span>
            </div>
        `;
    }
    
    // Update main profile section
    const profileImg = document.getElementById('profile-img');
    const profilePlaceholder = document.getElementById('profile-placeholder');
    const removeBtn = document.getElementById('remove-btn');
    
    if (profileImg && profilePlaceholder) {
        if (currentUser && (currentUser.googlePhoto || currentUser.facebookPhoto || currentUser.customPhoto)) {
            let photoUrl = currentUser.customPhoto || currentUser.googlePhoto || currentUser.facebookPhoto;
            
            // Use proxy for Google profile images to bypass CORS
            if (photoUrl && photoUrl.includes('googleusercontent.com')) {
                photoUrl = `/proxy/image?url=${encodeURIComponent(photoUrl)}`;
            }
            
            console.log('Setting profile image URL:', photoUrl);
            profileImg.src = photoUrl;
            profileImg.style.display = 'block';
            profilePlaceholder.style.display = 'none';
            if (removeBtn) removeBtn.classList.remove('hidden');
            
            // Add error handling for image loading
            profileImg.onerror = function() {
                console.error('Failed to load profile image:', photoUrl);
                profileImg.style.display = 'none';
                profilePlaceholder.style.display = 'block';
                profilePlaceholder.textContent = 'Failed to load profile photo';
            };
            
            profileImg.onload = function() {
                console.log('Profile image loaded successfully');
            };
        } else {
            console.log('No profile photo available');
            profileImg.style.display = 'none';
            profilePlaceholder.style.display = 'block';
            if (removeBtn) removeBtn.classList.add('hidden');
        }
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

// Profile photo upload functionality
function handleProfileUpload() {
    const fileInput = document.getElementById('profile-upload');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be smaller than 5MB.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            
            // Update current user with custom photo
            if (window.currentUser) {
                window.currentUser.customPhoto = dataUrl;
                updateUserInterface();
                
                // Save to localStorage for persistence
                localStorage.setItem('customProfilePhoto', dataUrl);
            }
        };
        reader.readAsDataURL(file);
    });
}

// Remove profile photo
function removeProfilePhoto() {
    if (window.currentUser) {
        delete window.currentUser.customPhoto;
        updateUserInterface();
        
        // Remove from localStorage
        localStorage.removeItem('customProfilePhoto');
    }
}

// Load custom photo from localStorage on page load
function loadCustomPhoto() {
    const savedPhoto = localStorage.getItem('customProfilePhoto');
    if (savedPhoto && window.currentUser) {
        window.currentUser.customPhoto = savedPhoto;
    }
}

// Initialize services grid
function initializeServices() {
    const services = [
        {
            name: 'Math Calculator',
            description: 'Advanced mathematical calculator with support for complex expressions, functions, and history.',
            url: '/math',
            icon: '🧮'
        },
        {
            name: 'FFT Visualizer',
            description: 'Interactive Fast Fourier Transform visualization tool for signal analysis.',
            url: '/fft-visualizer',
            icon: '📊'
        },
        {
            name: 'Story Generator',
            description: 'AI-powered story generator with customizable themes and word counts.',
            url: '/story-generator',
            icon: '📚',
            premium: true
        },
        {
            name: 'Contact Form',
            description: 'Get in touch with questions, feedback, or collaboration opportunities.',
            url: '/contact',
            icon: '📧'
        },
        {
            name: 'Subscription',
            description: 'Upgrade to premium for access to advanced features and AI services.',
            url: '/subscription',
            icon: '⭐'
        }
    ];
    
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    
    services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        if (service.premium) {
            serviceCard.classList.add('premium-required');
        }
        
        serviceCard.innerHTML = `
            <div class="service-icon">${service.icon}</div>
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            ${service.premium ? '<span class="premium-badge">Full subscription required</span>' : ''}
        `;
        
        serviceCard.onclick = () => {
            if (service.premium && service.url === '/story-generator') {
                checkStoryAccess();
            } else {
                try { 
                    window.location.href = service.url; 
                } catch (e) { 
                    /* ignore jsdom navigation */ 
                }
            }
        };
        
        servicesGrid.appendChild(serviceCard);
    });
}

// Initialize profile upload when DOM is ready
try {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleProfileUpload);
    } else {
        handleProfileUpload();
    }
    loadCustomPhoto();
} catch (e) {
    // In test env, DOM may be mocked — ignore
}

// Expose functions globally for testing
if (typeof global !== 'undefined') {
    global.checkServiceStatus = checkServiceStatus;
    global.addService = addService;
    global.checkStoryAccess = checkStoryAccess;
    global.updateUserInterface = updateUserInterface;
    global.removeProfilePhoto = removeProfilePhoto;
    global.initializeServices = initializeServices;
}

// Also expose to window for browser environment
if (typeof window !== 'undefined') {
    window.updateUserInterface = updateUserInterface;
    window.removeProfilePhoto = removeProfilePhoto;
    window.initializeServices = initializeServices;
}