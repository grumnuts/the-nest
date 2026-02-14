require('dotenv').config();

// Set timezone from environment variable
if (process.env.TZ) {
  process.env.TZ = process.env.TZ;
  console.log(`🌍 Timezone set to: ${process.env.TZ}`);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const listRoutes = require('./routes/lists');
const taskRoutes = require('./routes/tasks');
const goalRoutes = require('./routes/goals');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware - temporarily disabled for debugging
// app.use(helmet());
// CORS configuration - allow same-origin requests in Docker
const corsOptions = {
  credentials: true
};

// In production/Docker, allow same-origin. In development, allow localhost:3000
if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = true; // Allow same origin in production
} else {
  corsOptions.origin = process.env.CLIENT_URL || 'http://localhost:3000';
}

app.use(cors(corsOptions));

// Rate limiting - temporarily disabled for debugging
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const Database = require('./database');
    const testDb = new Database();
    
    // Test database connection
    testDb.db.get('SELECT 1 as test', [], (err, row) => {
      if (err) {
        console.error('❌ Database health check failed:', err);
        res.status(500).json({ 
          status: 'ERROR', 
          database: 'DISCONNECTED',
          error: err.message,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        });
      } else {
        res.json({ 
          status: 'OK', 
          database: 'CONNECTED',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        });
      }
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('public'));
  
  // Specific routes for assets to ensure they're served correctly
  app.get('/TheNestLogo.png', (req, res) => {
    const logoPath = path.join(__dirname, 'public', 'TheNestLogo.png');
    res.sendFile(logoPath);
  });
  
  app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    res.sendFile(faviconPath);
  });
  
  app.get('/logo192.png', (req, res) => {
    const logoPath = path.join(__dirname, 'public', 'logo192.png');
    res.sendFile(logoPath);
  });
  
  // Serve React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 The Nest server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕐 Current time: ${new Date().toLocaleString()}`);
  console.log(`🌍 Timezone: ${process.env.TZ || 'UTC'}`);
  
  // Wait a moment for database to be fully ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Initialize admin user on first startup
  const initializeAdmin = require('./init-admin');
  await initializeAdmin();
  
  console.log('🎉 Server startup complete!');
});

module.exports = app;
