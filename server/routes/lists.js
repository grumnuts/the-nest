const express = require('express');
const { authenticateToken, validateList } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Get all lists for authenticated users (shared across all users)
router.get('/', authenticateToken, (req, res) => {
  console.log('📋 Fetching lists for user:', req.user.username);
  
  // Check if database is available
  if (!db || !db.db) {
    console.error('❌ Database not available');
    return res.status(500).json({ error: 'Database not available' });
  }
  
  // Get all active lists (shared across all users) ordered by sort_order
  db.db.all('SELECT * FROM lists WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC', [], (err, lists) => {
    if (err) {
      console.error('❌ Error fetching lists:', err);
      return res.status(500).json({ error: 'Error fetching lists', details: err.message });
    }

    console.log(`✅ Successfully fetched ${lists.length} lists`);
    res.json({ lists });
  });
});

// Create a new list
router.post('/', authenticateToken, validateList, (req, res) => {
  // Check if user is admin
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create lists' });
  }
  
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

    // Admins can edit any list, other users must be owners or editors
    if (req.user.username !== 'admin') {
      const listAccess = userLists.find(list => 
        list.id === parseInt(listId) && 
        ['owner', 'editor'].includes(list.permission_level)
      );

      if (!listAccess) {
        return res.status(403).json({ error: 'Only list owners and editors can update lists' });
      }
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

    // Admins can delete any list, other users must be owners
    if (req.user.username !== 'admin') {
      const listAccess = userLists.find(list => 
        list.id === parseInt(listId) && 
        ['owner'].includes(list.permission_level)
      );

      if (!listAccess) {
        return res.status(403).json({ error: 'Only list owners can delete lists' });
      }
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

// Reorder lists
router.post('/reorder', authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Only admins can reorder lists' });
  }
  
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
