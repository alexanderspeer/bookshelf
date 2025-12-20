import React from 'react';

export const Loading: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '3rem',
      fontSize: '1.2rem',
      color: '#666'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          marginBottom: '1rem',
          fontSize: '2rem'
        }}>⏳</div>
        <div>Loading...</div>
      </div>
    </div>
  );
};

