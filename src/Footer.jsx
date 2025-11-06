import React from 'react';

const Footer = () => {
    return (
        <footer>
            <p>&copy; {new Date().getFullYear()} Matt Powers. All rights reserved.</p>
            <p>
                <a href="/privacy-policy">Privacy Policy</a> | 
                <a href="/terms-of-service"> Terms of Service</a> | 
                <a href="/contact"> Contact</a>
            </p>
        </footer>
    );
};

export default Footer;
