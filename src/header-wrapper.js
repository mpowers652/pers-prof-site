import React from 'react';
import ReactDOM from 'react-dom/client';
import Header from './Header.jsx';

document.addEventListener('DOMContentLoaded', () => {
    const headerRoot = document.getElementById('header-root');
    if (headerRoot) {
        const root = ReactDOM.createRoot(headerRoot);
        root.render(React.createElement(Header));
    }
});