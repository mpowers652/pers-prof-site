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

// Auto-mount if container exists on page load
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('story-generator-mount');
    if (container) {
        mountStoryGenerator('story-generator-mount', {
            user: window.currentUser,
            showTitle: true
        });
    }
});

// Export for manual mounting
window.mountStoryGenerator = mountStoryGenerator;