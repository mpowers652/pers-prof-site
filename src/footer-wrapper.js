import React from 'react';
import ReactDOM from 'react-dom/client';
import Footer from './Footer.jsx';

const footerRoot = document.getElementById('footer-root');
if (footerRoot) {
    const root = ReactDOM.createRoot(footerRoot);
    root.render(<Footer />);
}
