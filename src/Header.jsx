import React from 'react';

function Header() {
  const user = window.currentUser || { username: 'Guest', role: 'user' };
  const displayName = user.username || user.displayName || user.email?.split('@')[0] || 'User';
  
  return (
    <header style={{
      background: 'linear-gradient(90deg, #8B4513 0%, #A0522D 50%, #CD853F 100%)',
      color: 'white',
      padding: '0.8rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: '60px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'normal' }}>
          <a href="/" style={{ color: 'white', textDecoration: 'none' }}>Matt Powers - Services Hub</a>
        </h1>
        <div style={{ position: 'relative' }} className="dropdown">
          <span style={{ cursor: 'pointer', padding: '0.5rem' }}>Services ▼</span>
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '150px',
            display: 'none',
            zIndex: 1000
          }} className="dropdown-menu">
            <a href="/math" style={{ display: 'block', padding: '0.8rem 1rem', color: '#333', textDecoration: 'none' }}>Math Calculator</a>
            <a href="/fft-visualizer" style={{ display: 'block', padding: '0.8rem 1rem', color: '#333', textDecoration: 'none' }}>FFT Visualizer</a>
            <a href="/story-generator" style={{ display: 'block', padding: '0.8rem 1rem', color: '#333', textDecoration: 'none' }}>Story Generator</a>
            <a href="/contact" style={{ display: 'block', padding: '0.8rem 1rem', color: '#333', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative' }} className="user-dropdown">
          <a href="/profile" style={{ cursor: 'pointer', fontSize: '1rem', color: 'white', textDecoration: 'none' }}>🎭 Welcome, {displayName}!</a>
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '120px',
            display: 'none',
            zIndex: 1000
          }} className="user-menu">
            <a href="/profile" style={{ display: 'block', padding: '0.8rem 1rem', color: '#333', textDecoration: 'none' }}>Profile</a>
            <a href="/logout" style={{ display: 'block', padding: '0.8rem 1rem', color: '#333', textDecoration: 'none' }}>Log out</a>
          </div>
        </div>
        <span style={{
          background: user.role === 'admin' ? '#4CAF50' : '#2196F3',
          color: 'white',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}>{user.role.toUpperCase()}</span>
      </div>
      <style>{`
        .dropdown:hover .dropdown-menu {
          display: block !important;
        }
        .dropdown-menu a:hover {
          background: #f5f5f5;
        }
        .user-dropdown:hover .user-menu {
          display: block !important;
        }
        .user-menu a:hover {
          background: #f5f5f5;
        }
      `}</style>
    </header>
  );
}

export default Header;