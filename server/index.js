require('dotenv').config({ override: false });

// Log timezone information
const timezone = process.env.TZ || 'system default';
const now = new Date();
console.log(`🌍 Server timezone: ${timezone}`);
console.log(`🕐 Current time: ${now.toLocaleString('en-AU', { timeZone: process.env.TZ || undefined })}`);
console.log(`📅 Current date: ${now.toLocaleDateString('en-AU', { timeZone: process.env.TZ || undefined, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);

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

// Security headers
app.use(helmet({
  // Disable CSP here so React SPA loads correctly; configure explicitly if needed
  contentSecurityPolicy: false,
}));

// CORS configuration — never fall back to origin: true
const corsOptions = {
  credentials: true
};

const clientUrl = process.env.CLIENT_URL;
if (process.env.NODE_ENV === 'production') {
  // In production, only allow the explicitly configured CLIENT_URL
  // If CLIENT_URL is not set, cross-origin requests are blocked (same-origin still works)
  corsOptions.origin = clientUrl ? [clientUrl] : false;
} else {
  // In development, allow the configured CLIENT_URL or common local origins
  corsOptions.origin = clientUrl ? [clientUrl] : ['http://localhost:3000', 'http://localhost:5001'];
}

app.use(cors(corsOptions));

// General API rate limit: 300 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Strict rate limit on auth endpoints: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware — 1mb is plenty for this app
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

    testDb.db.get('SELECT 1 as test', [], (err, row) => {
      if (err) {
        console.error('❌ Database health check failed:', err);
        res.status(500).json({
          status: 'ERROR',
          database: 'DISCONNECTED',
          error: err.message,
          timestamp: new Date().toISOString(),
          version: '1.2.0'
        });
      } else {
        res.json({
          status: 'OK',
          database: 'CONNECTED',
          timestamp: new Date().toISOString(),
          version: '1.2.0'
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
      version: '1.2.0'
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  console.log(`🌐 Serving static files (NODE_ENV: ${process.env.NODE_ENV})`);
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/assets/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'assets', req.params.filename));
  });

  app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'favicon.ico'));
  });

  app.get('/logo192.png', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'logo192.png'));
  });

  // Serve React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });
} else {
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

// Emergency password reset — server-side only, never exposed via API
const checkEmergencyReset = async () => {
  if (process.env.EMERGENCY_RESET_PASSWORD && process.env.EMERGENCY_RESET_USER) {
    try {
      const newPassword = process.env.EMERGENCY_RESET_PASSWORD;
      const targetUser = process.env.EMERGENCY_RESET_USER;

      if (newPassword.length < 8) {
        console.error('❌ EMERGENCY_RESET_PASSWORD must be at least 8 characters');
        return;
      }

      console.log('\n🚨 🚨 🚨 EMERGENCY PASSWORD RESET 🚨 🚨 🚨');
      console.log(`🔐 User: ${targetUser}`);

      const Database = require('./database');
      const db = new Database();

      await new Promise(resolve => setTimeout(resolve, 2000));

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

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await new Promise((resolve, reject) => {
        db.db.run('UPDATE users SET password_hash = ? WHERE username = ?',
          [hashedPassword, targetUser], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`✅ Password reset successful for: ${targetUser}`);
      console.log('🔑 New password is now active');
      console.log('⚠️  IMPORTANT: Remove EMERGENCY_RESET_* environment variables immediately');
      console.log('⚠️  Then restart the server');
      console.log('🚨 🚨 🚨 EMERGENCY PASSWORD RESET 🚨 🚨 🚨\n');

    } catch (error) {
      console.error('❌ Emergency password reset failed:', error.message);
    }
  }
};

// Start server
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  await new Promise(resolve => setTimeout(resolve, 1000));
  await checkEmergencyReset();

  console.log(`Server ready at http://localhost:${PORT}`);
});

module.exports = app;
