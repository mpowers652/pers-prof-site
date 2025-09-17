import React from 'react';
import ReactDOM from 'react-dom/client';
import Header from './Header';

// Mount header to any page
if (document.getElementById('header-root')) {
    const headerRoot = ReactDOM.createRoot(document.getElementById('header-root'));
    headerRoot.render(<Header />);
}