import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('PWA Error Boundary caught an error:', error, errorInfo);
    
    // Store error info for debugging
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Try to recover by clearing cache and reloading
    this.attemptRecovery();
  }

  attemptRecovery = () => {
    try {
      // Clear any potentially corrupted data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear caches if available
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        });
      }
      
      // Attempt reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      console.error('Recovery attempt failed:', e);
    }
  };

  handleManualRecovery = () => {
    this.attemptRecovery();
  };

  render() {
    if (this.state.hasError) {
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
            <h1 style={{ color: '#fbbf24', marginBottom: '20px' }}>
              The Nest
            </h1>
            <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>
              App Encountered an Error
            </h2>
            <p style={{ marginBottom: '30px', fontSize: '14px', lineHeight: '1.5' }}>
              We're working to fix this. The app will automatically try to recover.
            </p>
            
            <button
              onClick={this.handleManualRecovery}
              style={{
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              Try to Recover
            </button>
            
            <div style={{ fontSize: '12px', opacity: '0.7' }}>
              <p>If the problem persists:</p>
              <p>1. Close and reopen the app</p>
              <p>2. Clear the app data in settings</p>
              <p>3. Reinstall the app</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
