const express = require('express');
const { authenticateToken, validateTask } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Create a new task
router.post('/', authenticateToken, validateTask, (req, res) => {
  
  const { title, description, list_id, assigned_to, duration_minutes, allow_multiple_completions } = req.body;
  const createdBy = req.user.userId;

  // Check if user has admin permission for the list
  db.getUserListPermission(createdBy, list_id, (err, permission) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    if (permission !== 'admin' && permission !== 'owner') {
      return res.status(403).json({ error: 'Only list admins can create tasks' });
    }

    // Create the task
    db.createTask(title, description, list_id, assigned_to, createdBy, duration_minutes, allow_multiple_completions, (err, taskId) => {
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

// Update task status (complete/incomplete) - shared across all users
// Optional body param: date (YYYY-MM-DD) to record completion on a specific date
router.patch('/:id/status', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const { is_completed, date } = req.body;
  const userId = req.user.userId;
  
  // If a date is provided, record the completion at noon on that date
  const completedAt = date ? `${date} 12:00:00` : null;

  // Get the task and check list permissions
  db.getTaskById(taskId, (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching task' });
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has permission to access this list
    db.getUserListPermission(userId, task.list_id, (err, permission) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking permissions' });
      }

      if (!permission) {
        return res.status(403).json({ error: 'No permission to access this list' });
      }

      // For completing tasks, both admin and user roles can do it
      // For uncompleting, we'll check in the undo endpoint

      // For repeating tasks, always add a new completion when marked as done
      if (is_completed && task.allow_multiple_completions === 1) {
        db.addTaskCompletion(taskId, userId, completedAt, (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error adding task completion' });
          }
          
          // Update task status to completed
          db.updateTaskStatus(taskId, true, userId, (err, changes) => {
            if (err) {
              return res.status(500).json({ error: 'Error updating task status' });
            }

            res.json({
              message: 'Task completed successfully',
              is_completed: true
            });
          });
        });
      } else if (is_completed) {
        // For regular tasks being completed, add completion record and update status
        db.addTaskCompletion(taskId, userId, completedAt, (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error adding task completion' });
          }
          
          // Update task status to completed
          db.updateTaskStatus(taskId, true, userId, (err, changes) => {
            if (err) {
              return res.status(500).json({ error: 'Error updating task status' });
            }

            if (changes === 0) {
              return res.status(404).json({ error: 'Task not found' });
            }

            res.json({
              message: 'Task completed successfully',
              is_completed: true
            });
          });
        });
      } else {
        // For uncompleting tasks, just update the status
        db.updateTaskStatus(taskId, false, null, (err, changes) => {
          if (err) {
            return res.status(500).json({ error: 'Error updating task status' });
          }

          if (changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
          }

          res.json({
            message: 'Task status updated successfully',
            is_completed: false
          });
        });
      }
    });
  });
});

// Undo last completion - only allow users to undo their own completions
// Optional body param: date (YYYY-MM-DD) to undo completion within that date
router.patch('/:id/undo', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.userId;
  const { date } = req.body || {};

  // First get the task to check if it exists
  db.getTaskById(taskId, (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching task' });
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get completions - optionally filtered by date
    const getCompletions = (cb) => {
      if (date) {
        const dateStart = `${date} 00:00:00`;
        const dateEnd = `${date} 23:59:59`;
        db.db.all(`
          SELECT tc.*, u.username 
          FROM task_completions tc 
          JOIN users u ON tc.completed_by = u.id 
          WHERE tc.task_id = ? AND tc.completed_at >= ? AND tc.completed_at <= ?
          ORDER BY tc.completed_at DESC
        `, [taskId, dateStart, dateEnd], cb);
      } else {
        db.getTaskCompletions(taskId, cb);
      }
    };

    getCompletions((err, completions) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching completions' });
      }

      if (!completions || completions.length === 0) {
        // No completion records found - check if this is a legacy completed task
        if (task.allow_multiple_completions === 1) {
          return res.status(400).json({ error: 'No completions to undo for repeating task' });
        }

        // For regular legacy tasks, just mark as incomplete
        db.updateTaskStatus(taskId, false, null, (err, changes) => {
          if (err) {
            return res.status(500).json({ error: 'Error updating task status' });
          }

          if (changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
          }

          res.json({
            message: 'Task undone successfully',
            is_completed: false
          });
        });
        return;
      }

      // Find the last completion by the current user
      const userCompletions = completions.filter(c => c.completed_by === userId);
      if (userCompletions.length === 0) {
        return res.status(403).json({ error: 'You have not completed this task' });
      }

      // Remove the user's last completion
      const lastUserCompletion = userCompletions[0];
      db.removeTaskCompletion(lastUserCompletion.id, (err, changes) => {
        if (err) {
          return res.status(500).json({ error: 'Error removing completion' });
        }

        // Check if there are any completions left (globally, not date-scoped)
        db.getTaskCompletions(taskId, (err, allCompletions) => {
          if (err) {
            return res.status(500).json({ error: 'Error checking completions' });
          }

          // If no completions left at all, mark task as incomplete
          if (!allCompletions || allCompletions.length === 0) {
            db.updateTaskStatus(taskId, false, null, (err) => {
              if (err) {
                return res.status(500).json({ error: 'Error updating task status' });
              }
              res.json({
                message: 'Last completion removed and task marked incomplete',
                is_completed: false
              });
            });
          } else {
            res.json({
              message: 'Last completion removed',
              is_completed: true
            });
          }
        });
      });
    });
  });
});

// Update task details
router.patch('/:id', authenticateToken, (req, res) => {
  
  const taskId = req.params.id;
  const { title, description, duration_minutes, allow_multiple_completions } = req.body;
  const userId = req.user.userId;

  // First get the task to check permissions
  db.getTaskById(taskId, (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching task' });
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has admin permission for the list
    db.getUserListPermission(userId, task.list_id, (err, permission) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking permissions' });
      }

      if (permission !== 'admin' && permission !== 'owner') {
        return res.status(403).json({ error: 'Only list admins can update tasks' });
      }

      // Update task details
      db.updateTask(taskId, title, description, duration_minutes, allow_multiple_completions, (err, changes) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating task' });
        }

        if (changes === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }

        res.json({
          message: 'Task updated successfully'
        });
      });
    });
  });
});

// Get tasks for a specific list (shared across all users)
// Optional query params: ?date=YYYY-MM-DD or ?dateStart=YYYY-MM-DD&dateEnd=YYYY-MM-DD
router.get('/list/:listId', authenticateToken, (req, res) => {
  const listId = req.params.listId;
  const { date, dateStart, dateEnd } = req.query;

  if (dateStart && dateEnd) {
    // Range-scoped: return tasks with completions within the date range
    const start = `${dateStart} 00:00:00`;
    const end = `${dateEnd} 23:59:59`;
    
    db.getTasksByListForDate(listId, start, end, (err, tasks) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching tasks' });
      }
      res.json({ tasks });
    });
  } else if (date) {
    // Single date-scoped: return tasks with completions for that day
    const start = `${date} 00:00:00`;
    const end = `${date} 23:59:59`;
    
    db.getTasksByListForDate(listId, start, end, (err, tasks) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching tasks' });
      }
      // Debug: Log the tasks being returned for single date
      console.log('Tasks returned from DB for single date:', JSON.stringify(tasks, null, 2));
      res.json({ tasks });
    });
  } else {
    // No date filter - return all completions (legacy/static lists)
    db.getTasksByList(listId, (err, tasks) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching tasks' });
      }
      // Debug: Log the tasks being returned
      console.log('Tasks returned from DB:', JSON.stringify(tasks, null, 2));
      res.json({ tasks });
    });
  }
});

// Delete a task
router.delete('/:id', authenticateToken, (req, res) => {
  
  const taskId = req.params.id;
  const userId = req.user.userId;

  // First get the task to check permissions
  db.getTaskById(taskId, (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching task' });
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has admin permission for the list
    db.getUserListPermission(userId, task.list_id, (err, permission) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking permissions' });
      }

      if (permission !== 'admin' && permission !== 'owner') {
        return res.status(403).json({ error: 'Only list admins can delete tasks' });
      }

      // Delete the task (this will also delete related completions due to foreign key constraints)
      db.deleteTask(taskId, (err, changes) => {
        if (err) {
          return res.status(500).json({ error: 'Error deleting task' });
        }

        if (changes === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }

        res.json({
          message: 'Task deleted successfully'
        });
      });
    });
  });
});

// Reorder tasks within a list
router.post('/reorder/:listId', authenticateToken, (req, res) => {
  
  const { listId } = req.params;
  const { taskIds } = req.body;
  const userId = req.user.userId;
  
  if (!Array.isArray(taskIds)) {
    return res.status(400).json({ error: 'taskIds must be an array' });
  }

  // Check if user has admin permission for the list
  db.getUserListPermission(userId, listId, (err, permission) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    if (permission !== 'admin' && permission !== 'owner') {
      return res.status(403).json({ error: 'Only list admins can reorder tasks' });
    }

    // Update the sort_order for each task
    let completedUpdates = 0;
    const totalUpdates = taskIds.length;
    
    taskIds.forEach((taskId, index) => {
      db.updateTaskSortOrder(taskId, index, (err, changes) => {
        if (err) {
          console.error(`Error updating sort order for task ${taskId}:`, err);
          return res.status(500).json({ error: 'Error updating task order' });
        }
        
        completedUpdates++;
        if (completedUpdates === totalUpdates) {
          res.json({ message: 'Task order updated successfully' });
        }
      });
    });
  });
});

module.exports = router;
