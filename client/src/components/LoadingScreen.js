import React from 'react';

const LoadingScreen = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1e1b4b',
      color: 'white',
      textAlign: 'center',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '400px' }}>
        <h1 style={{ color: '#fbbf24', marginBottom: '30px', fontSize: '32px' }}>
          The Nest
        </h1>
        
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #7c3aed',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
        </div>
        
        <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>
          Loading...
        </h2>
        
        <p style={{ fontSize: '14px', opacity: '0.8' }}>
          Preparing your task management experience
        </p>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
