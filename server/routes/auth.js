const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateRegistration, validateLogin, JWT_SECRET } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Register new user
router.post('/register', validateRegistration, (req, res) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  db.getUserByEmail(email, (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
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

// Login user
router.post('/login', validateLogin, (req, res) => {
  const { email, password } = req.body;

  db.getUserByEmail(email, (err, user) => {
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

module.exports = router;
