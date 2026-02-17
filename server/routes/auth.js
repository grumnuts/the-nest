const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateLogin, authenticateToken, JWT_SECRET } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Login user
router.post('/login', validateLogin, (req, res) => {
  console.log('🔐 Login attempt for username:', req.body.username);
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
        { 
          userId: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role || (user.is_admin ? 'admin' : 'user'), // Use new role field or fallback to is_admin
          is_admin: user.is_admin, // Keep for backward compatibility
          hide_goals: user.hide_goals, 
          hide_completed_tasks: user.hide_completed_tasks 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { 
          userId: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role || (user.is_admin ? 'admin' : 'user'),
          is_admin: user.is_admin, // Keep for backward compatibility
          hide_goals: user.hide_goals, 
          hide_completed_tasks: user.hide_completed_tasks 
        }
      });
    });
  });
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  console.log('🔍 Token verification for user:', req.user.username);
  res.json({
    user: {
      userId: req.user.userId,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role || (req.user.is_admin ? 'admin' : 'user'),
      is_admin: req.user.is_admin, // Keep for backward compatibility
      hide_goals: req.user.hide_goals,
      hide_completed_tasks: req.user.hide_completed_tasks
    }
  });
});

// Change username
router.post('/change-username', authenticateToken, async (req, res) => {
  try {
    const { newUsername, password } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!newUsername || !password) {
      return res.status(400).json({ error: 'New username and current password are required' });
    }

    if (newUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    // Get current user to verify password
    db.getUserById(userId, async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching user data' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Check if new username is already taken
      db.getUserByUsername(newUsername, (err, existingUser) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking username availability' });
        }

        if (existingUser) {
          return res.status(400).json({ error: 'Username is already taken' });
        }

        // Update username
        db.updateUserUsername(userId, newUsername, (err, changes) => {
          if (err) {
            return res.status(500).json({ error: 'Error updating username' });
          }

          if (changes === 0) {
            return res.status(404).json({ error: 'User not found' });
          }

          // Get updated user data
          db.getUserById(userId, (err, updatedUser) => {
            if (err) {
              return res.status(500).json({ error: 'Error fetching updated user data' });
            }

            // Generate new JWT token with updated username
            const token = jwt.sign(
              { 
                userId: updatedUser.id, 
                username: updatedUser.username, 
                email: updatedUser.email, 
                is_admin: updatedUser.is_admin, 
                hide_goals: updatedUser.hide_goals,
                hide_completed_tasks: updatedUser.hide_completed_tasks
              },
              JWT_SECRET,
              { expiresIn: '24h' }
            );

            res.json({
              message: 'Username updated successfully',
              token,
              user: { 
                userId: updatedUser.id, 
                username: updatedUser.username, 
                email: updatedUser.email, 
                is_admin: updatedUser.is_admin,
                hide_goals: updatedUser.hide_goals,
                hide_completed_tasks: updatedUser.hide_completed_tasks
              }
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error changing username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

// Change email
router.post('/change-email', authenticateToken, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!newEmail || !password) {
      return res.status(400).json({ error: 'New email and current password are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Get current user to verify password
    db.getUserById(userId, async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching user data' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Check if new email is already taken
      db.getUserByEmail(newEmail, (err, existingUser) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking email availability' });
        }

        if (existingUser) {
          return res.status(400).json({ error: 'Email is already taken' });
        }

        // Update email
        db.updateUserEmail(userId, newEmail, (err, changes) => {
          if (err) {
            return res.status(500).json({ error: 'Error updating email' });
          }

          if (changes === 0) {
            return res.status(404).json({ error: 'User not found' });
          }

          // Get updated user data
          db.getUserById(userId, (err, updatedUser) => {
            if (err) {
              return res.status(500).json({ error: 'Error fetching updated user data' });
            }

            // Generate new JWT token with updated email
            const token = jwt.sign(
              { 
                userId: updatedUser.id, 
                username: updatedUser.username, 
                email: updatedUser.email, 
                is_admin: updatedUser.is_admin, 
                hide_goals: updatedUser.hide_goals,
                hide_completed_tasks: updatedUser.hide_completed_tasks
              },
              JWT_SECRET,
              { expiresIn: '24h' }
            );

            res.json({
              message: 'Email updated successfully',
              token,
              user: { 
                userId: updatedUser.id, 
                username: updatedUser.username, 
                email: updatedUser.email, 
                is_admin: updatedUser.is_admin,
                hide_goals: updatedUser.hide_goals,
                hide_completed_tasks: updatedUser.hide_completed_tasks
              }
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error changing email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
