import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        window.location.replace('/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '3rem auto', padding: '2rem', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <button type="submit" style={{ width: '100%', padding: 10, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 4 }}>Login</button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      <div style={{ marginTop: 16 }}>
        <a href="/register">Don't have an account? Register</a>
      </div>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button onClick={() => window.location.href = '/auth/google'} className="btn oauth-btn google-icon-btn">Login with Google</button>
        <button onClick={() => window.location.href = '/auth/facebook'} className="btn oauth-btn facebook-btn" style={{ marginLeft: 8 }}>Login with Facebook</button>
        <button onClick={() => { localStorage.setItem('userType', 'guest'); window.location.href = '/'; }} className="btn guest-btn" style={{ marginLeft: 8 }}>Continue as Guest</button>
      </div>
    </div>
  );
}

export default LoginPage;
