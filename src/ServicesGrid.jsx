import React, { useState, useEffect } from 'react';
import Toast from './Toast';

function ServicesGrid() {
  const [showToast, setShowToast] = useState(false);
  const user = window.currentUser || { username: 'Guest', role: 'user' };
  const displayName = user.username || user.displayName || user.email?.split('@')[0] || 'User';
  
  const handleServiceClick = (service) => {
    if (service.premium && user.username === 'Guest') {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000); // Hide toast after 5 seconds
    } else {
      window.location.href = service.url;
    }
  };
  const services = [
    { name: 'Math Calculator', desc: 'Advanced mathematical calculations with support for complex numbers, trigonometry, and more.', url: '/math' },
    { name: 'FFT Visualizer', desc: 'Interactive Fast Fourier Transform visualization tool for signal analysis.', url: '/fft-visualizer' },
    { name: 'Story Generator', desc: 'AI-powered story generation with customizable themes and lengths.', url: '/story-generator', premium: true },
    { name: 'Contact', desc: 'Get in touch for questions, feedback, or collaboration opportunities.', url: '/contact' }
  ];

  return (
    <div>
      {showToast && (
        <Toast 
          message="Story Generator requires an account. Please register or log in to access this feature." 
          type="warning" 
          duration={5000} 
        />
      )}
      <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h2>Welcome, {displayName}!</h2>
        <p>Role: {user.role} | Subscription: {user.subscription || 'basic'}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        {services.map(service => (
          <div key={service.name} 
               style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer' }}
               onClick={() => handleServiceClick(service)}>
            <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>{service.name}</h3>
            <p style={{ color: '#666', lineHeight: '1.5' }}>
              {service.desc} {service.premium && <span style={{ background: '#f39c12', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem' }}>Premium</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServicesGrid;