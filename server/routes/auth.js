const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateRegistration, validateLogin, authenticateToken, JWT_SECRET } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Register new user
router.post('/register', validateRegistration, (req, res) => {
  const { username, email, password } = req.body;

  // Check if username already exists
  db.getUserByUsername(username, (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    db.getUserByEmail(email, (err, existingEmailUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingEmailUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash password
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          return res.status(500).json({ error: 'Error hashing password' });
        }

        // Create user
        db.createUser(username, email, hash, (err, userId) => {
          if (err) {
            return res.status(500).json({ error: 'Error creating user' });
          }

          // Generate JWT token
          const token = jwt.sign(
            { userId, username, email },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.status(201).json({
            message: 'User created successfully',
            token,
            user: { userId, username, email }
          });
        });
      });
    });
  });
});

// Login user
router.post('/login', validateLogin, (req, res) => {
  const { username, password } = req.body;

  db.getUserByUsername(username, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    bcrypt.compare(password, user.password_hash, (err, isValid) => {
      if (err) {
        return res.status(500).json({ error: 'Error comparing passwords' });
      }

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { userId: user.id, username: user.username, email: user.email }
      });
    });
  });
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    user: {
      userId: req.user.userId,
      username: req.user.username,
      email: req.user.email
    }
  });
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Get current user data
    db.getUserById(userId, async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching user data' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      db.updateUserPassword(userId, newPasswordHash, (err, changes) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating password' });
        }

        if (changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Password updated successfully' });
      });
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
