import React from 'react';

function ServicesGrid() {
  const user = window.currentUser || { username: 'Guest', role: 'user' };
  const displayName = user.username || user.displayName || user.email?.split('@')[0] || 'User';
  const services = [
    { name: 'Math Calculator', desc: 'Advanced mathematical calculations with support for complex numbers, trigonometry, and more.', url: '/math' },
    { name: 'FFT Visualizer', desc: 'Interactive Fast Fourier Transform visualization tool for signal analysis.', url: '/fft-visualizer' },
    { name: 'Story Generator', desc: 'AI-powered story generation with customizable themes and lengths.', url: '/story-generator', premium: true },
    { name: 'Contact', desc: 'Get in touch for questions, feedback, or collaboration opportunities.', url: '/contact' }
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h2>Welcome, {displayName}!</h2>
        <p>Role: {user.role} | Subscription: {user.subscription || 'basic'}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        {services.map(service => (
          <div key={service.name} 
               style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer' }}
               onClick={() => window.location.href = service.url}>
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