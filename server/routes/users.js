const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { authenticateToken, validateLogin, JWT_SECRET, hasAdminPrivileges, hasOwnerPrivileges } = require('../middleware/auth');
const Database = require('../database');

const db = new Database();

// Get all users (any authenticated user)
router.get('/', authenticateToken, (req, res) => {
  // Get all users with role field
  db.db.all('SELECT id, username, email, is_admin, role, created_at FROM users', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching users' });
    }
    
    res.json(users);
  });
});

// Create new user (admin only)
router.post('/', authenticateToken, (req, res) => {
  const { username, email, password, role } = req.body;
  const userId = req.user.userId;
  
  // Check if user is admin
  db.getUserById(userId, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking user permissions' });
    }
    
    if (!user || !hasAdminPrivileges(user)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if user already exists
    db.db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking existing user' });
      }
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      
      // Hash password before creating user
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          return res.status(500).json({ error: 'Error hashing password' });
        }
        
        // Create user with hashed password
        db.createUser(username, email, hash, (err, newUserId) => {
          if (err) {
            return res.status(500).json({ error: 'Error creating user' });
          }
          
          // Set role for the new user
          const userRole = (role === 'owner' || role === 'admin' || role === 'user') ? role : 'user';
          const isAdmin = (userRole === 'admin' || userRole === 'owner') ? 1 : 0;
          
          db.db.run('UPDATE users SET role = ?, is_admin = ? WHERE id = ?', [userRole, isAdmin, newUserId], (err) => {
            if (err) {
              console.error('Error setting user role:', err);
            }
            res.status(201).json({
              message: 'User created successfully',
              userId: newUserId,
              role: userRole
            });
          });
        });
      });
    });
  });
});

// Update user (admin only)
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { username, email, password, role } = req.body;
  const adminUserId = req.user.userId;
  
  // Check if user has admin privileges
  db.getUserById(adminUserId, (err, adminUser) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking user permissions' });
    }
    
    if (!adminUser || !hasAdminPrivileges(adminUser)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Don't allow editing admin account unless current user is owner
    if (parseInt(id) === 1 && !hasOwnerPrivileges(adminUser)) {
      return res.status(403).json({ error: 'Only owners can edit admin account' });
    }
    
    // Don't allow admins to edit owners (only owners can edit owners)
    db.getUserById(parseInt(id), (err, targetUser) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking target user' });
      }
      
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if target user is owner and current user is not owner
      if (targetUser.role === 'owner' && !hasOwnerPrivileges(adminUser)) {
        return res.status(403).json({ error: 'Only owners can edit owner accounts' });
      }
      
      // Validate input
      if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required' });
      }
      
      // Check if username/email already exists for another user
      db.db.get('SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?', [username, email, id], (err, existingUser) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking existing user' });
        }
        
        if (existingUser) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        
        // Update user
        const userRole = (role === 'owner' || role === 'admin' || role === 'user') ? role : 'user';
        const isAdmin = (userRole === 'admin' || userRole === 'owner') ? 1 : 0;
        let query = 'UPDATE users SET username = ?, email = ?, role = ?, is_admin = ?';
        let params = [username, email, userRole, isAdmin];
        
        if (password) {
          // Hash new password
          bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
              return res.status(500).json({ error: 'Error hashing password' });
            }
            
            query += ', password_hash = ? WHERE id = ?';
            params.push(hash, id);
            
            db.db.run(query, params, function(err) {
              if (err) {
                return res.status(500).json({ error: 'Error updating user' });
              }
              
              res.json({ message: 'User updated successfully' });
            });
          });
        } else {
          query += ' WHERE id = ?';
          params.push(id);
          
          db.db.run(query, params, function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error updating user' });
            }
            
            res.json({ message: 'User updated successfully' });
          });
        }
      });
    });
  });
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const adminUserId = req.user.userId;
  
  // Check if user is admin
  db.getUserById(adminUserId, (err, adminUser) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking user permissions' });
    }
    
    if (!adminUser || !adminUser.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Don't allow deleting admin account
    if (parseInt(id) === 1) {
      return res.status(403).json({ error: 'Cannot delete admin account' });
    }
    
    // Delete user
    db.db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting user' });
      }
      
      res.json({ message: 'User deleted successfully' });
    });
  });
});

// Update user's hide_goals preference
router.patch('/hide-goals', authenticateToken, (req, res) => {
  const { hide_goals } = req.body;
  const userId = req.user.userId;
  
  // Validate input
  if (typeof hide_goals !== 'boolean') {
    return res.status(400).json({ error: 'hide_goals must be a boolean value' });
  }
  
  db.updateUserHideGoals(userId, hide_goals, (err, changes) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating hide_goals preference' });
    }
    
    if (changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'Hide goals preference updated successfully',
      hide_goals: hide_goals
    });
  });
});

// Update user's hide_completed_tasks preference
router.patch('/hide-completed-tasks', authenticateToken, (req, res) => {
  const { hide_completed_tasks } = req.body;
  const userId = req.user.userId;
  
  // Validate input
  if (typeof hide_completed_tasks !== 'boolean') {
    return res.status(400).json({ error: 'hide_completed_tasks must be a boolean value' });
  }
  
  db.updateUserHideCompletedTasks(userId, hide_completed_tasks, (err, changes) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating hide_completed_tasks preference' });
    }
    
    if (changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'Hide completed tasks preference updated successfully',
      hide_completed_tasks: hide_completed_tasks
    });
  });
});

module.exports = router;
