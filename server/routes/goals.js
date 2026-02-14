const express = require('express');
const { authenticateToken, validateGoal } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Get user goals
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.getUserGoals(userId, (err, goals) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching goals' });
    }

    res.json({ goals });
  });
});

// Set or update user goal for a specific list
router.post('/', authenticateToken, validateGoal, (req, res) => {
  const { list_id, tasks_per_period } = req.body;
  const userId = req.user.userId;

  // Check if user has access to the list
  db.getListsByUser(userId, (err, userLists) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const hasAccess = userLists.some(list => list.id === parseInt(list_id));
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Set the goal
    db.setUserGoal(userId, list_id, tasks_per_period, (err, goalId) => {
      if (err) {
        return res.status(500).json({ error: 'Error setting goal' });
      }

      res.status(201).json({
        message: 'Goal set successfully',
        goalId
      });
    });
  });
});

// Get progress for a specific list
router.get('/progress/:listId', authenticateToken, (req, res) => {
  const listId = req.params.listId;
  const userId = req.user.userId;

  // Check if user has access to the list
  db.getListsByUser(userId, (err, userLists) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const list = userLists.find(l => l.id === parseInt(listId));
    if (!list) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get tasks for this list
    db.getTasksByList(listId, (err, tasks) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching tasks' });
      }

      // Get user goals for this list
      db.getUserGoals(userId, (err, goals) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching goals' });
        }

        const goal = goals.find(g => g.list_id === parseInt(listId));
        const tasksPerPeriod = goal ? goal.tasks_per_period : 0;

        // Calculate progress
        const completedTasks = tasks.filter(task => task.is_completed && task.assigned_to === userId).length;
        const totalAssignedTasks = tasks.filter(task => task.assigned_to === userId).length;
        const progressPercentage = tasksPerPeriod > 0 ? (completedTasks / tasksPerPeriod) * 100 : 0;

        res.json({
          listId: parseInt(listId),
          listName: list.name,
          resetPeriod: list.reset_period,
          tasksPerPeriod,
          completedTasks,
          totalAssignedTasks,
          progressPercentage: Math.min(progressPercentage, 100),
          goalMet: completedTasks >= tasksPerPeriod
        });
      });
    });
  });
});

module.exports = router;
