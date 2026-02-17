require('dotenv').config({ override: false });

// Set timezone from environment variable
if (process.env.TZ) {
  process.env.TZ = process.env.TZ;
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');

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

// Use CLIENT_URL for CORS configuration, with sensible defaults
const clientUrl = process.env.CLIENT_URL;
if (process.env.NODE_ENV === 'production') {
  // In production, allow the configured client URL or same-origin
  corsOptions.origin = clientUrl ? [clientUrl] : true;
} else {
  // In development, allow the configured client URL or localhost:3000
  corsOptions.origin = clientUrl ? [clientUrl] : ['http://localhost:3000', 'http://localhost:5001'];
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
  console.log(`🌐 Serving static files (NODE_ENV: ${process.env.NODE_ENV})`);
  app.use(express.static(path.join(__dirname, '..', 'public')));
  
  // Specific routes for assets to ensure they're served correctly
  app.get('/assets/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'assets', req.params.filename));
  });
  
  app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
    res.sendFile(faviconPath);
  });
  
  app.get('/logo192.png', (req, res) => {
    const logoPath = path.join(__dirname, '..', 'public', 'logo192.png');
    res.sendFile(logoPath);
  });
  
  // Serve React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
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

// Emergency password reset function
const checkEmergencyReset = async () => {
  if (process.env.EMERGENCY_RESET_PASSWORD && process.env.EMERGENCY_RESET_USER) {
    try {
      const newPassword = process.env.EMERGENCY_RESET_PASSWORD;
      const targetUser = process.env.EMERGENCY_RESET_USER;
      
      console.log('\n🚨 🚨 🚨 EMERGENCY PASSWORD RESET 🚨 🚨 🚨');
      console.log(`� User: ${targetUser}`);
      
      // Initialize database connection
      const Database = require('./database');
      const db = new Database();
      
      // Wait for database to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify user exists
      const user = await new Promise((resolve, reject) => {
        db.db.get('SELECT id, username FROM users WHERE username = ?', [targetUser], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!user) {
        console.log(`❌ User '${targetUser}' not found in database`);
        return;
      }
      
      // Hash and update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await new Promise((resolve, reject) => {
        db.db.run('UPDATE users SET password_hash = ? WHERE username = ?', 
          [hashedPassword, targetUser], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log(`✅ Password reset successful for: ${targetUser}`);
      console.log('🔑 New password is now active');
      console.log('⚠️  IMPORTANT: Remove EMERGENCY_RESET_* environment variables');
      console.log('⚠️  Then restart the server to clear this message');
      console.log('🚨 🚨 🚨 EMERGENCY PASSWORD RESET 🚨 🚨 🚨\n');
      
    } catch (error) {
      console.error('❌ Emergency password reset failed:', error.message);
    }
  }
};

// Start server
app.listen(PORT, async () => {
  // Wait a moment for database to be fully ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check for emergency password reset
  await checkEmergencyReset();
  
  // Initialize admin user on first startup - removed init-admin.js during cleanup
  // Admin initialization is now handled through the database setup
  
  });

module.exports = app;
