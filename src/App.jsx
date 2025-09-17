import React from 'react';
import Header from './Header';
import ServicesGrid from './ServicesGrid';

function App() {
  return (
    <div>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <ServicesGrid />
      </main>
    </div>
  );
}

export default App;