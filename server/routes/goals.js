const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Simplified progress calculation function
const calculateSimpleProgress = async (goal, listIds) => {
  try {
    // Get current date for period calculation
    const now = new Date();
    let periodStart, periodEnd;
    
    // Calculate period dates based on period_type
    switch (goal.period_type) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
        break;
      case 'annually':
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    // Get task completions for the period
    const completions = await new Promise((resolve, reject) => {
      db.getTaskCompletionsInPeriod(goal.user_id, periodStart.toISOString(), periodEnd.toISOString(), (err, completions) => {
        if (err) reject(err);
        else resolve(completions || []);
      });
    });

    // Filter completions by goal's lists
    const relevantCompletions = completions.filter(completion => {
      return listIds.length === 0 || listIds.includes(completion.list_id);
    });

    let completed = 0;
    let required = goal.target_value;

    // Calculate completed value based on calculation type
    switch (goal.calculation_type) {
      case 'percentage_task_count':
        // For percentage, we need total tasks in lists
        const totalTasks = await new Promise((resolve, reject) => {
          if (listIds.length === 0) {
            resolve(0);
            return;
          }
          const placeholders = listIds.map(() => '?').join(',');
          db.db.all(
            `SELECT COUNT(*) as count FROM tasks WHERE list_id IN (${placeholders})`,
            listIds,
            (err, result) => {
              if (err) reject(err);
              else resolve(result[0].count);
            }
          );
        });
        completed = totalTasks > 0 ? (relevantCompletions.length / totalTasks) * 100 : 0;
        required = goal.target_value; // Use the actual target percentage from goal
        break;
      case 'percentage_time':
        // For percentage time, we need total possible time from all tasks in lists
        const totalPossibleTime = await new Promise((resolve, reject) => {
          if (listIds.length === 0) {
            resolve(0);
            return;
          }
          const placeholders = listIds.map(() => '?').join(',');
          db.db.all(
            `SELECT SUM(duration_minutes) as total_time FROM tasks WHERE list_id IN (${placeholders})`,
            listIds,
            (err, result) => {
              if (err) reject(err);
              else resolve(result[0].total_time || 0);
            }
          );
        });
        const completedTime = relevantCompletions.reduce((sum, completion) => {
          return sum + (completion.duration_minutes || 0);
        }, 0);
        completed = totalPossibleTime > 0 ? (completedTime / totalPossibleTime) * 100 : 0;
        required = goal.target_value; // Use the actual target percentage from goal
        break;
      case 'fixed_task_count':
        completed = relevantCompletions.length;
        break;
      case 'fixed_time':
        completed = relevantCompletions.reduce((sum, completion) => {
          return sum + (completion.duration_minutes || 0);
        }, 0);
        break;
      default:
        completed = relevantCompletions.length;
    }

    const percentage = required > 0 ? (completed / required) * 100 : 0;
    const isAchieved = percentage >= 100;

    return {
      required: required,
      completed: completed,
      percentage: percentage,
      isAchieved: isAchieved,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString()
    };
  } catch (error) {
    console.error('Error calculating progress:', error);
    return {
      required: goal.target_value,
      completed: 0,
      percentage: 0,
      isAchieved: false,
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString()
    };
  }
};

// Get goals for current user
router.get('/my-goals', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const goals = await new Promise((resolve, reject) => {
      db.getGoalsByUserId(userId, (err, goals) => {
        if (err) reject(err);
        else resolve(goals);
      });
    });

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      const listIds = JSON.parse(goal.list_ids);
      const progress = await calculateSimpleProgress(goal, listIds);
      return {
        ...goal,
        list_ids: listIds,
        progress: progress
      };
    }));

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Error fetching goals' });
  }
});

// Get all goals (admin only)
router.get('/all-goals', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view all goals' });
  }

  try {
    const goals = await new Promise((resolve, reject) => {
      db.getAllGoals((err, goals) => {
        if (err) reject(err);
        else resolve(goals);
      });
    });

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      const listIds = JSON.parse(goal.list_ids);
      const progress = await calculateSimpleProgress(goal, listIds);
      return {
        ...goal,
        list_ids: listIds,
        progress: progress
      };
    }));

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Error fetching goals' });
  }
});

// Create a new goal (admin only)
router.post('/', authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create goals' });
  }

  const { 
    userId, 
    name, 
    description, 
    calculationType, 
    targetValue, 
    periodType, 
    listIds 
  } = req.body;

  // Validate required fields
  if (!userId || !name || !calculationType || targetValue === undefined || !periodType || !listIds) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate calculation type
  const validCalculationTypes = ['percentage_task_count', 'percentage_time', 'fixed_task_count', 'fixed_time'];
  if (!validCalculationTypes.includes(calculationType)) {
    return res.status(400).json({ error: 'Invalid calculation type' });
  }

  // Validate period type
  const validPeriodTypes = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];
  if (!validPeriodTypes.includes(periodType)) {
    return res.status(400).json({ error: 'Invalid period type' });
  }

  db.createGoal(userId, name, description, calculationType, targetValue, periodType, listIds, req.user.userId, (err, goalId) => {
    if (err) {
      return res.status(500).json({ error: 'Error creating goal' });
    }

    res.status(201).json({
      message: 'Goal created successfully',
      goalId: goalId
    });
  });
});

// Update a goal (admin only)
router.patch('/:id', authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update goals' });
  }

  const goalId = req.params.id;
  const { 
    name, 
    description, 
    calculationType, 
    targetValue, 
    periodType, 
    listIds 
  } = req.body;

  // Validate required fields
  if (!name || !calculationType || targetValue === undefined || !periodType || !listIds) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.updateGoal(goalId, name, description, calculationType, targetValue, periodType, listIds, (err, changes) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating goal' });
    }

    if (changes === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({
      message: 'Goal updated successfully'
    });
  });
});

// Delete a goal (admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  // Check if user is admin
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete goals' });
  }

  const goalId = req.params.id;

  db.deleteGoal(goalId, (err, changes) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting goal' });
    }

    if (changes === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({
      message: 'Goal deleted successfully'
    });
  });
});

// Get goal progress history
router.get('/:id/progress', authenticateToken, (req, res) => {
  const goalId = req.params.id;
  const userId = req.user.userId;

  // First check if user has access to this goal
  db.getGoalById(goalId, (err, goal) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching goal' });
    }

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Check if user is admin or the goal owner
    if (req.user.username !== 'admin' && goal.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.getGoalProgress(goalId, (err, progress) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching goal progress' });
      }

      res.json({ progress });
    });
  });
});

// Helper function to calculate goal progress
function calculateGoalProgress(goal, listIds) {
  return new Promise((resolve) => {
    // Get current period dates
    const periodDates = getCurrentPeriodDates(goal.period_type);
    const { periodStart, periodEnd } = periodDates;
    
    // Fetch all tasks from the specified lists
    const taskPromises = listIds.map(listId => 
      new Promise((taskResolve, taskReject) => {
        db.getTasksByList(listId, (err, tasks) => {
          if (err) taskReject(err);
          else taskResolve(tasks || []);
        });
      })
    );
    
    Promise.all(taskPromises).then(allTasks => {
      const tasks = allTasks.flat();
      
      // Fetch completions for this period
      db.getTaskCompletionsInPeriod(goal.user_id, periodStart, periodEnd, (err, completions) => {
        if (err) {
          console.error('Error fetching completions:', err);
          resolve({
            required: goal.target_value,
            completed: 0,
            percentage: 0,
            isAchieved: false,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString()
          });
          return;
        }
        
        // Calculate based on calculation type
        let result;
        switch (goal.calculation_type) {
          case 'percentage_task_count':
            result = calculatePercentageTaskCount(goal, tasks, completions);
            break;
          case 'percentage_time':
            result = calculatePercentageTime(goal, tasks, completions);
            break;
          case 'fixed_task_count':
            result = calculateFixedTaskCount(goal, tasks, completions);
            break;
          case 'fixed_time':
            result = calculateFixedTime(goal, tasks, completions);
            break;
          default:
            result = {
              required: goal.target_value,
              completed: 0,
              percentage: 0,
              isAchieved: false
            };
        }
        
        resolve({
          ...result,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString()
        });
      });
    }).catch(err => {
      console.error('Error fetching tasks:', err);
      resolve({
        required: goal.target_value,
        completed: 0,
        percentage: 0,
        isAchieved: false,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString()
      });
    });
  });
}

// Get current period start and end dates
function getCurrentPeriodDates(periodType) {
  const now = new Date();
  const periodStart = new Date();
  const periodEnd = new Date();
  
  switch (periodType) {
    case 'daily':
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
      periodStart.setDate(diff);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setDate(diff + 6);
      periodEnd.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setMonth(now.getMonth() + 1, 0);
      periodEnd.setHours(23, 59, 59, 999);
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart.setMonth(quarter * 3, 1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setMonth((quarter + 1) * 3, 0);
      periodEnd.setHours(23, 59, 59, 999);
      break;
    case 'annually':
      periodStart.setMonth(0, 1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setMonth(11, 31);
      periodEnd.setHours(23, 59, 59, 999);
      break;
  }
  
  return { periodStart, periodEnd };
}

// Calculate percentage of task count
function calculatePercentageTaskCount(goal, tasks, completions) {
  const totalTasks = tasks.length;
  const requiredTasks = Math.ceil(totalTasks * (goal.target_value / 100));
  const completedTasks = completions.length;
  const percentage = totalTasks > 0 ? (completedTasks / requiredTasks) * 100 : 0;
  
  return {
    required: requiredTasks,
    completed: completedTasks,
    percentage: Math.min(percentage, 100),
    isAchieved: completedTasks >= requiredTasks
  };
}

// Calculate percentage of time
function calculatePercentageTime(goal, tasks, completions) {
  const totalTime = tasks.reduce((sum, task) => sum + (task.duration_minutes || 0), 0);
  const requiredTime = totalTime * (goal.target_value / 100);
  const completedTime = completions.reduce((sum, completion) => {
    const task = tasks.find(t => t.id === completion.task_id);
    return sum + (task ? (task.duration_minutes || 0) : 0);
  }, 0);
  const percentage = totalTime > 0 ? (completedTime / requiredTime) * 100 : 0;
  
  return {
    required: Math.round(requiredTime),
    completed: Math.round(completedTime),
    percentage: Math.min(percentage, 100),
    isAchieved: completedTime >= requiredTime
  };
}

// Calculate fixed task count
function calculateFixedTaskCount(goal, tasks, completions) {
  const requiredTasks = goal.target_value;
  const completedTasks = completions.length;
  const percentage = requiredTasks > 0 ? (completedTasks / requiredTasks) * 100 : 0;
  
  return {
    required: requiredTasks,
    completed: completedTasks,
    percentage: Math.min(percentage, 100),
    isAchieved: completedTasks >= requiredTasks
  };
}

// Calculate fixed time
function calculateFixedTime(goal, tasks, completions) {
  const requiredTime = goal.target_value;
  const completedTime = completions.reduce((sum, completion) => {
    const task = tasks.find(t => t.id === completion.task_id);
    return sum + (task ? (task.duration_minutes || 0) : 0);
  }, 0);
  const percentage = requiredTime > 0 ? (completedTime / requiredTime) * 100 : 0;
  
  return {
    required: requiredTime,
    completed: Math.round(completedTime),
    percentage: Math.min(percentage, 100),
    isAchieved: completedTime >= requiredTime
  };
}

module.exports = router;
