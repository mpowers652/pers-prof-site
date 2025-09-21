const { JSDOM } = require('jsdom');

describe('Services Grid', () => {
    let dom, window, document;
    
    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <main>
                    <section id="services">
                        <h2>Available Services</h2>
                        <div class="services-grid" id="services-grid">
                            <!-- Services will be populated by JavaScript -->
                        </div>
                    </section>
                </main>
            </body>
            </html>
        `);
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
        
        // Load script functions
        require('./script.js');
    });
    
    test('should populate services grid with available services', () => {
        global.initializeServices();
        
        const servicesGrid = document.getElementById('services-grid');
        const serviceCards = servicesGrid.querySelectorAll('.service-card');
        
        expect(serviceCards.length).toBe(5); // Math, FFT, Story, Contact, Subscription
        
        // Check if all expected services are present
        const serviceNames = Array.from(serviceCards).map(card => 
            card.querySelector('h3').textContent
        );
        
        expect(serviceNames).toContain('Math Calculator');
        expect(serviceNames).toContain('FFT Visualizer');
        expect(serviceNames).toContain('Story Generator');
        expect(serviceNames).toContain('Contact Form');
        expect(serviceNames).toContain('Subscription');
    });
    
    test('should mark story generator as premium', () => {
        global.initializeServices();
        
        const servicesGrid = document.getElementById('services-grid');
        const storyCard = Array.from(servicesGrid.querySelectorAll('.service-card'))
            .find(card => card.querySelector('h3').textContent === 'Story Generator');
        
        expect(storyCard.classList.contains('premium-required')).toBe(true);
        expect(storyCard.querySelector('.premium-badge')).toBeTruthy();
    });
    
    test('should include service icons', () => {
        global.initializeServices();
        
        const servicesGrid = document.getElementById('services-grid');
        const serviceCards = servicesGrid.querySelectorAll('.service-card');
        
        serviceCards.forEach(card => {
            const icon = card.querySelector('.service-icon');
            expect(icon).toBeTruthy();
            expect(icon.textContent.length).toBeGreaterThan(0);
        });
    });
    
    test('should handle click events on service cards', () => {
        // Mock window.location
        delete window.location;
        window.location = { href: '' };
        
        global.initializeServices();
        
        const servicesGrid = document.getElementById('services-grid');
        const mathCard = Array.from(servicesGrid.querySelectorAll('.service-card'))
            .find(card => card.querySelector('h3').textContent === 'Math Calculator');
        
        // Simulate click
        mathCard.click();
        
        expect(window.location.href).toBe('/math');
    });
    
    test('should call checkStoryAccess for story generator', () => {
        // Mock checkStoryAccess
        global.checkStoryAccess = jest.fn();
        
        global.initializeServices();
        
        const servicesGrid = document.getElementById('services-grid');
        const storyCard = Array.from(servicesGrid.querySelectorAll('.service-card'))
            .find(card => card.querySelector('h3').textContent === 'Story Generator');
        
        // Simulate click
        storyCard.click();
        
        expect(global.checkStoryAccess).toHaveBeenCalled();
    });
});