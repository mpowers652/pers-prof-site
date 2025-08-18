// Smooth scrolling for navigation links
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
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

// Simple service status checker
function checkServiceStatus(serviceUrl) {
    return fetch(serviceUrl)
        .then(response => response.ok)
        .catch(() => false);
}

// Add service dynamically
function addService(name, description, url) {
    const serviceGrid = document.querySelector('.service-grid');
    const serviceCard = document.createElement('div');
    serviceCard.className = 'service-card';
    serviceCard.innerHTML = `
        <h3>${name}</h3>
        <p>${description}</p>
        <a href="${url}" class="btn">Access</a>
    `;
    serviceGrid.appendChild(serviceCard);
    
    // Add to dropdown menu
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const menuItem = document.createElement('li');
    menuItem.innerHTML = `<a href="${url}">${name}</a>`;
    dropdownMenu.appendChild(menuItem);
}