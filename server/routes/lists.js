const express = require('express');
const { authenticateToken, validateList } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Get all lists for the authenticated user
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.getListsByUser(userId, (err, lists) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching lists' });
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

module.exports = router;
