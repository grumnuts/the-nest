const express = require('express');
const { authenticateToken, validateList } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Get all lists for authenticated users based on permissions
router.get('/', authenticateToken, (req, res) => {
  // Check if database is available
  if (!db || !db.db) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  // Get lists that the user has permission to access
  const userId = req.user.userId;
  const query = `
    SELECT l.* 
    FROM lists l
    JOIN user_list_permissions ulp ON l.id = ulp.list_id
    WHERE ulp.user_id = ? AND l.is_active = 1
    ORDER BY l.sort_order ASC, l.created_at ASC
  `;
  
  db.db.all(query, [userId], (err, lists) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching lists', details: err.message });
    }

    res.json({ lists });
  });
});

// Create a new list
router.post('/', authenticateToken, validateList, (req, res) => {
  
  const { name, description, reset_period } = req.body;
  const createdBy = req.user.userId;

  db.createList(name, description, reset_period, createdBy, (err, listId) => {
    if (err) {
      return res.status(500).json({ error: 'Error creating list' });
    }

    // Add creator as owner of the list
    db.addUserToList(createdBy, listId, 'owner', (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error setting list permissions' });
      }

      res.status(201).json({
        message: 'List created successfully',
        listId
      });
    });
  });
});

// Get a specific list with its tasks
router.get('/:id', authenticateToken, (req, res) => {
  const listId = req.params.id;
  const userId = req.user.userId;

  // Check if user has access to this list
  db.getListsByUser(userId, (err, userLists) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const hasAccess = userLists.some(list => list.id === parseInt(listId));
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get list details
    db.getListById(listId, (err, list) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching list' });
      }

      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      // Get tasks for this list
      db.getTasksByList(listId, (err, tasks) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching tasks' });
        }

        res.json({ list, tasks });
      });
    });
  });
});

// Get list snapshots (history)
router.get('/:id/history', authenticateToken, (req, res) => {
  const listId = req.params.id;
  const userId = req.user.userId;

  // Check if user has access to this list
  db.getListsByUser(userId, (err, userLists) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const hasAccess = userLists.some(list => list.id === parseInt(listId));
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get list snapshots
    db.getListSnapshots(listId, (err, snapshots) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching history' });
      }

      // Parse JSON data for each snapshot
      const parsedSnapshots = snapshots.map(snapshot => ({
        ...snapshot,
        snapshot_data: JSON.parse(snapshot.snapshot_data)
      }));

      res.json({ snapshots: parsedSnapshots });
    });
  });
});

// Update a list
router.patch('/:id', authenticateToken, (req, res) => {
  const listId = req.params.id;
  const { name, description, reset_period } = req.body;
  const userId = req.user.userId;

  // First check if user has access to the list
  db.getListsByUser(userId, (err, userLists) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    // Only owners can edit lists (including admin users - they must be owners of the specific list)
    const listAccess = userLists.find(list => 
      list.id === parseInt(listId) && 
      list.permission_level === 'owner'
    );

    if (!listAccess) {
      return res.status(403).json({ error: 'Only list owners can edit lists' });
    }

    // Update the list
    db.updateList(listId, name, description, reset_period, (err, changes) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating list' });
      }

      if (changes === 0) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json({
        message: 'List updated successfully'
      });
    });
  });
});

// Delete a list
router.delete('/:id', authenticateToken, (req, res) => {
  const listId = req.params.id;
  const userId = req.user.userId;

  // First check if user has access to the list
  db.getListsByUser(userId, (err, userLists) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    // Only owners can delete lists (including admin users - they must be owners of the specific list)
    const listAccess = userLists.find(list => 
      list.id === parseInt(listId) && 
      list.permission_level === 'owner'
    );

    if (!listAccess) {
      return res.status(403).json({ error: 'Only list owners can delete lists' });
    }

    // Delete the list (this will also delete related tasks and completions due to foreign key constraints)
    db.deleteList(listId, (err, changes) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting list' });
      }

      if (changes === 0) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json({
        message: 'List deleted successfully'
      });
    });
  });
});

// Get users with permissions for a specific list
router.get('/:id/users', authenticateToken, (req, res) => {
  const listId = req.params.id;
  const userId = req.user.userId;

  const hasListAdminPermission = (userId, listId, callback) => {
    db.getUserListPermission(userId, listId, (err, permission) => {
      if (err) {
        return callback(err);
      }
      callback(null, permission === 'admin' || permission === 'owner');
    });
  };

  hasListAdminPermission(userId, listId, (err, isAdmin) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    if (!isAdmin) {
      return res.status(403).json({ error: 'No permission to access this list' });
    }

    // If user is admin, return all users. If user is regular user, return only their own permission
    if (isAdmin) {
      // Get all users with permissions for this list
      db.getListUsers(listId, (err, users) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching list users' });
        }

        res.json(users);
      });
    } else {
      // Return only the current user's permission
      db.getListUsers(listId, (err, users) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching list users' });
        }

        const currentUserPermission = users.find(u => u.id === userId);
        res.json([currentUserPermission]);
      });
    }
  });
});

// Add user to list
router.post('/:id/users', authenticateToken, (req, res) => {
  const listId = req.params.id;
  const { userId, permissionLevel } = req.body;
  const currentUserId = req.user.userId;

  // Validate permission level
  if (!['admin', 'owner', 'user'].includes(permissionLevel)) {
    return res.status(400).json({ error: 'Invalid permission level' });
  }

  // Check if current user has admin permission for this list
  db.getUserListPermission(currentUserId, listId, (err, permission) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    if (permission !== 'admin' && permission !== 'owner') {
      return res.status(403).json({ error: 'Only list admins can add users' });
    }

    // Add user to list
    db.addUserToList(userId, listId, permissionLevel, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error adding user to list' });
      }

      res.json({ message: 'User added to list successfully' });
    });
  });
});

// Remove user from list
router.delete('/:id/users/:userId', authenticateToken, (req, res) => {
  const listId = req.params.id;
  const targetUserId = req.params.userId;
  const currentUserId = req.user.userId;

  // Check if current user has admin permission for this list
  db.getUserListPermission(currentUserId, listId, (err, permission) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    if (permission !== 'admin' && permission !== 'owner') {
      return res.status(403).json({ error: 'Only list admins can remove users' });
    }

    // Don't allow removing yourself if you're the only admin
    if (targetUserId == currentUserId) {
      return res.status(400).json({ error: 'Cannot remove yourself from the list' });
    }

    // Remove user from list
    db.removeUserFromList(targetUserId, listId, (err, changes) => {
      if (err) {
        return res.status(500).json({ error: 'Error removing user from list' });
      }

      if (changes === 0) {
        return res.status(404).json({ error: 'User not found in list' });
      }

      res.json({ message: 'User removed from list successfully' });
    });
  });
});

// Reorder lists
router.post('/reorder', authenticateToken, checkAdmin, (req, res) => {
  
  const { listIds } = req.body;
  
  if (!Array.isArray(listIds)) {
    return res.status(400).json({ error: 'listIds must be an array' });
  }

  // Update the sort_order for each list
  let completedUpdates = 0;
  const totalUpdates = listIds.length;
  
  listIds.forEach((listId, index) => {
    db.updateListSortOrder(listId, index, (err, changes) => {
      if (err) {
        console.error(`Error updating sort order for list ${listId}:`, err);
        return res.status(500).json({ error: 'Error updating list order' });
      }
      
      completedUpdates++;
      if (completedUpdates === totalUpdates) {
        res.json({ message: 'List order updated successfully' });
      }
    });
  });
});

module.exports = router;
