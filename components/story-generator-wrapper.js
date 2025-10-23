// Wrapper to mount React StoryGenerator component in vanilla HTML pages
import React from 'react';
import ReactDOM from 'react-dom/client';
import StoryGenerator from './StoryGenerator.jsx';

// Function to mount StoryGenerator in any container
export function mountStoryGenerator(containerId, props = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id "${containerId}" not found`);
        return;
    }

    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(StoryGenerator, props));
    
    return root;
}

// Function to update user in mounted components
export function updateStoryGeneratorUser(user) {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('auth:updated', { 
        detail: { user } 
    }));
}

// Auto-mount if container exists on page load
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('story-generator-mount');
    if (container) {
        const root = mountStoryGenerator('story-generator-mount', {
            user: window.currentUser,
            showTitle: true
        });
        
        // Re-render when user authentication changes
        const handleAuthUpdate = () => {
            if (root && container) {
                root.render(React.createElement(StoryGenerator, {
                    user: window.currentUser,
                    showTitle: true
                }));
            }
        };
        
        window.addEventListener('auth:updated', handleAuthUpdate);
        window.addEventListener('storage', (e) => {
            if (e.key === 'token' || e.key === 'userType') {
                handleAuthUpdate();
            }
        });
    }
});

// Export for manual mounting
window.mountStoryGenerator = mountStoryGenerator;