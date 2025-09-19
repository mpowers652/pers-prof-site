import React, { useState, useEffect } from 'react';

const Toast = ({ message, type = 'info', duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  const toastStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '1rem 2rem',
    backgroundColor: type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db',
    color: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out'
  };

  return (
    <div style={toastStyle}>
      {message}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Toast;