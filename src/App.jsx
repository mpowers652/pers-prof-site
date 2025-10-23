import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './Header';
import ServicesGrid from './ServicesGrid';
import LoginPage from './LoginPage';
import ProfilePage from './ProfilePage';

function App() {
  return (
    <Router>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/" element={<ServicesGrid />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;