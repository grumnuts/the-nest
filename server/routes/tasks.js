const express = require('express');
const { authenticateToken, validateTask } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Create a new task
router.post('/', authenticateToken, validateTask, (req, res) => {
  const { title, description, list_id, assigned_to } = req.body;
  const createdBy = req.user.userId;

  // Check if user has access to the list
  db.getListsByUser(createdBy, (err, userLists) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const hasAccess = userLists.some(list => 
      list.id === parseInt(list_id) && 
      ['owner', 'editor'].includes(list.permission_level)
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to create tasks' });
    }

    // Create the task
    db.createTask(title, description, list_id, assigned_to, createdBy, (err, taskId) => {
      if (err) {
        return res.status(500).json({ error: 'Error creating task' });
      }

      res.status(201).json({
        message: 'Task created successfully',
        taskId
      });
    });
  });
});

// Update task status (complete/incomplete)
router.patch('/:id/status', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const { is_completed } = req.body;
  const userId = req.user.userId;

  // First get the task to check permissions
  db.getTasksByList(null, (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching task' });
    }

    const task = tasks.find(t => t.id === parseInt(taskId));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to the list
    db.getListsByUser(userId, (err, userLists) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking permissions' });
      }

      const hasAccess = userLists.some(list => 
        list.id === task.list_id && 
        ['owner', 'editor'].includes(list.permission_level)
      );

      // Also allow the assigned user to update their own task status
      const isAssignedUser = task.assigned_to === userId;

      if (!hasAccess && !isAssignedUser) {
        return res.status(403).json({ error: 'Insufficient permissions to update this task' });
      }

      // Update task status
      db.updateTaskStatus(taskId, is_completed, (err, changes) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating task status' });
        }

        if (changes === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }

        res.json({
          message: 'Task status updated successfully',
          is_completed
        });
      });
    });
  });
});

// Get tasks for a specific list
router.get('/list/:listId', authenticateToken, (req, res) => {
  const listId = req.params.listId;
  const userId = req.user.userId;

  // Check if user has access to the list
  db.getListsByUser(userId, (err, userLists) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const hasAccess = userLists.some(list => list.id === parseInt(listId));
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get tasks for this list
    db.getTasksByList(listId, (err, tasks) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching tasks' });
      }

      res.json({ tasks });
    });
  });
});

module.exports = router;
