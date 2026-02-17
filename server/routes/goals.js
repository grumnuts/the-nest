const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Enhanced progress calculation function that accounts for all periods within a list type
const calculateMultiPeriodProgress = async (goal, listIds, selectedPeriod = null) => {
  try {
    // If no list IDs provided, get all lists of the same reset period type
    if (listIds.length === 0 && goal.period_type !== 'static') {
      const allLists = await new Promise((resolve, reject) => {
        db.getListsByResetPeriod(goal.period_type, (err, lists) => {
          if (err) reject(err);
          else resolve(lists || []);
        });
      });
      listIds = allLists.map(list => list.id);
    }

    // Calculate period dates based on goal's period_type
    const now = new Date();
    let periods = [];
    
    if (selectedPeriod) {
      // Calculate specific period
      periods = [calculatePeriodDates(goal.period_type, selectedPeriod)];
    } else {
      // Calculate current period
      periods = [calculatePeriodDates(goal.period_type, now)];
    }

    let totalCompleted = 0;
    let totalRequired = 0;

    // Calculate progress for each period
    for (const period of periods) {
      // Determine if this is the current period
      const now = new Date();
      const isCurrentPeriod = selectedPeriod === null && 
        period.start <= now && period.end >= now;
      
      const periodProgress = await calculatePeriodProgress(goal, listIds, period.start, period.end, isCurrentPeriod);
      totalCompleted += periodProgress.completed;
      totalRequired += periodProgress.required;
    }

    const percentage = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;
    const isAchieved = percentage >= 100;

    return {
      required: totalRequired,
      completed: totalCompleted,
      percentage: percentage,
      isAchieved: isAchieved,
      periodStart: periods[0].start.toISOString(),
      periodEnd: periods[periods.length - 1].end.toISOString(),
      periods: periods.map(p => ({
        start: p.start.toISOString(),
        end: p.end.toISOString(),
        label: p.label
      }))
    };
  } catch (error) {
    console.error('Error calculating multi-period progress:', error);
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

// Helper function to calculate period dates
const calculatePeriodDates = (periodType, date) => {
  const start = new Date(date);
  const end = new Date(date);
  let label = '';

  switch (periodType) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = start.toLocaleDateString('en-AU');
      break;
    case 'weekly':
      const dayOfWeek = start.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday start
      start.setDate(start.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      label = `Week of ${start.toLocaleDateString('en-AU')}`;
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      label = start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      break;
    case 'quarterly':
      const quarter = Math.floor(start.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth((quarter + 1) * 3, 0);
      end.setHours(23, 59, 59, 999);
      label = `Q${quarter + 1} ${start.getFullYear()}`;
      break;
    case 'annually':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      label = `${start.getFullYear()}`;
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = start.toLocaleDateString('en-AU');
  }

  return { start, end, label };
};

// Calculate how many times a list's tasks repeat within a goal period
// For the current (in-progress) period, cap at today so we don't count future days
const getRepetitionsInPeriod = (listResetPeriod, goalPeriodType, periodStart, periodEnd, isCurrentPeriod = true) => {
  if (listResetPeriod === 'static') return 1;
  
  // Period dates are already in local time (server TZ is set)
  // Normalize to midnight for day counting
  const startDay = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
  const endDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
  
  let effectiveEndDay = endDay;
  
  // Only cap at today if this is the current period
  if (isCurrentPeriod) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    effectiveEndDay = endDay > today ? today : endDay;
  }
  
  // Calculate days between start and end (inclusive)
  const startUTC = Date.UTC(startDay.getFullYear(), startDay.getMonth(), startDay.getDate());
  const endUTC = Date.UTC(effectiveEndDay.getFullYear(), effectiveEndDay.getMonth(), effectiveEndDay.getDate());
  const periodDays = Math.max(1, Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1);
  
  switch (listResetPeriod) {
    case 'daily':
      return periodDays;
    case 'weekly':
      return Math.max(1, Math.round(periodDays / 7));
    case 'fortnightly':
      return Math.max(1, Math.round(periodDays / 14));
    case 'monthly':
      return Math.max(1, Math.round(periodDays / 30));
    case 'quarterly':
      return Math.max(1, Math.round(periodDays / 91));
    case 'annually':
      return Math.max(1, Math.round(periodDays / 365));
    default:
      return 1;
  }
};

// Helper function to calculate progress for a single period
const calculatePeriodProgress = async (goal, listIds, periodStart, periodEnd, isCurrentPeriod = true) => {
  // Get task completions for the period
  const completions = await new Promise((resolve, reject) => {
    db.getTaskCompletionsInPeriod(goal.user_id, periodStart.toISOString(), periodEnd.toISOString(), (err, completions) => {
      if (err) reject(err);
      else resolve(completions || []);
    });
  });

  // Get list details to know each list's reset_period
  const lists = await new Promise((resolve, reject) => {
    if (listIds.length === 0) {
      resolve([]);
      return;
    }
    const placeholders = listIds.map(() => '?').join(',');
    db.db.all(
      `SELECT id, reset_period FROM lists WHERE id IN (${placeholders})`,
      listIds,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  // Filter completions to only include tasks from lists that still exist
  const existingListIds = lists.map(l => l.id);
  const relevantCompletions = completions.filter(completion => {
    return existingListIds.includes(completion.list_id);
  });

  let completed = 0;
  let required = goal.target_value;

  // Calculate completed value based on calculation type
  switch (goal.calculation_type) {
    case 'percentage_task_count': {
      // Total expected task completions = tasks per list × full repetitions in period
      let totalExpectedTasks = 0;
      for (const list of lists) {
        // For expected tasks, always use full period (no capping)
        const fullReps = getRepetitionsInPeriod(list.reset_period, goal.period_type, periodStart, periodEnd, false);
        const taskCount = await new Promise((resolve, reject) => {
          db.db.get(
            `SELECT COUNT(*) as count FROM tasks WHERE list_id = ?`,
            [list.id],
            (err, result) => {
              if (err) reject(err);
              else resolve(result.count);
            }
          );
        });
        totalExpectedTasks += taskCount * fullReps;
      }
      
      // For completed tasks, we only count what's actually done (completions already handle this)
      completed = totalExpectedTasks > 0 ? (relevantCompletions.length / totalExpectedTasks) * 100 : 0;
      required = goal.target_value;
      break;
    }
    case 'percentage_time': {
      // Total possible time = task durations per list × full repetitions in period
      let totalPossibleTime = 0;
      for (const list of lists) {
        // For expected time, always use full period (no capping)
        const fullReps = getRepetitionsInPeriod(list.reset_period, goal.period_type, periodStart, periodEnd, false);
        const listTime = await new Promise((resolve, reject) => {
          db.db.get(
            `SELECT COALESCE(SUM(duration_minutes), 0) as total_time FROM tasks WHERE list_id = ?`,
            [list.id],
            (err, result) => {
              if (err) reject(err);
              else resolve(result.total_time);
            }
          );
        });
        totalPossibleTime += listTime * fullReps;
      }
      const completedTime = relevantCompletions.reduce((sum, completion) => {
        return sum + (completion.duration_minutes || 0);
      }, 0);
      completed = totalPossibleTime > 0 ? (completedTime / totalPossibleTime) * 100 : 0;
      required = goal.target_value;
      break;
    }
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

  return {
    required: required,
    completed: completed,
    percentage: required > 0 ? (completed / required) * 100 : 0
  };
};

// Main progress calculation - delegates to calculatePeriodProgress
// Optional referenceDate param to calculate for a specific period instead of current
const calculateSimpleProgress = async (goal, listIds, referenceDate) => {
  try {
    const date = referenceDate ? new Date(referenceDate + 'T12:00:00') : new Date();
    const period = calculatePeriodDates(goal.period_type, date);
    
    // Determine if this is the current period
    const now = new Date();
    const isCurrentPeriod = !referenceDate && 
      period.start <= now && period.end >= now;
    
    const result = await calculatePeriodProgress(goal, listIds, period.start, period.end, isCurrentPeriod);
    
    return {
      ...result,
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      periodLabel: period.label
    };
  } catch (error) {
    console.error('Error calculating progress:', error);
    return { completed: 0, required: goal.target_value || 100 };
  }
};

// Get goals for current user
// Optional query param: ?date=YYYY-MM-DD to get progress for a specific period
router.get('/my-goals', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const dateParam = req.query.date || null;
  
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
      const progress = await calculateSimpleProgress(goal, listIds, dateParam);
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
// Optional query param: ?date=YYYY-MM-DD to get progress for a specific period
router.get('/all-goals', authenticateToken, checkAdmin, async (req, res) => {
  const dateParam = req.query.date || null;

  // Check if database is available
  if (!db || !db.db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    const goals = await new Promise((resolve, reject) => {
      db.getAllGoals((err, goals) => {
        if (err) {
          reject(err);
        } else {
          resolve(goals);
        }
      });
    });

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      const listIds = JSON.parse(goal.list_ids);
      const progress = await calculateSimpleProgress(goal, listIds, dateParam);
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

// Get progress for a single goal at a specific date
// Query param: ?date=YYYY-MM-DD
router.get('/:id/progress', authenticateToken, async (req, res) => {
  const goalId = req.params.id;
  const dateParam = req.query.date || null;

  try {
    const goal = await new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM goals WHERE id = ?', [goalId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const listIds = JSON.parse(goal.list_ids);
    const progress = await calculateSimpleProgress(goal, listIds, dateParam);

    res.json({
      goalId: goal.id,
      progress: progress
    });
  } catch (error) {
    console.error('Error fetching goal progress:', error);
    res.status(500).json({ error: 'Error fetching goal progress' });
  }
});

// Create a new goal (admin only)
router.post('/', authenticateToken, checkAdmin, (req, res) => {

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
router.patch('/:id', authenticateToken, checkAdmin, (req, res) => {

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
router.delete('/:id', authenticateToken, checkAdmin, (req, res) => {

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
    if (!req.user.is_admin && goal.user_id !== userId) {
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

// Get available periods for a goal type
router.get('/periods/:periodType', authenticateToken, async (req, res) => {
  const { periodType } = req.params;
  const { limit = 10 } = req.query;
  
  try {
    const periods = [];
    const now = new Date();
    
    // Generate periods (past, current, and future)
    for (let i = Math.floor(limit / 2); i >= 0; i--) {
      const date = new Date(now);
      
      switch (periodType) {
        case 'daily':
          date.setDate(date.getDate() - i);
          break;
        case 'weekly':
          date.setDate(date.getDate() - (i * 7));
          break;
        case 'monthly':
          date.setMonth(date.getMonth() - i);
          break;
        case 'quarterly':
          date.setMonth(date.getMonth() - (i * 3));
          break;
        case 'annually':
          date.setFullYear(date.getFullYear() - i);
          break;
      }
      
      const period = calculatePeriodDates(periodType, date);
      periods.push({
        date: date.toISOString(),
        label: period.label,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        isCurrent: i === 0
      });
    }
    
    // Add future periods
    for (let i = 1; i <= Math.floor(limit / 2); i++) {
      const date = new Date(now);
      
      switch (periodType) {
        case 'daily':
          date.setDate(date.getDate() + i);
          break;
        case 'weekly':
          date.setDate(date.getDate() + (i * 7));
          break;
        case 'monthly':
          date.setMonth(date.getMonth() + i);
          break;
        case 'quarterly':
          date.setMonth(date.getMonth() + (i * 3));
          break;
        case 'annually':
          date.setFullYear(date.getFullYear() + i);
          break;
      }
      
      const period = calculatePeriodDates(periodType, date);
      periods.push({
        date: date.toISOString(),
        label: period.label,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        isCurrent: false
      });
    }
    
    // Sort periods by date
    periods.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({ periods });
  } catch (error) {
    console.error('Error fetching periods:', error);
    res.status(500).json({ error: 'Error fetching periods' });
  }
});

// Get goal progress for specific period
router.get('/:goalId/progress', authenticateToken, async (req, res) => {
  const { goalId } = req.params;
  const { period, date } = req.query;
  
  try {
    const goal = await new Promise((resolve, reject) => {
      db.getGoalById(goalId, (err, goal) => {
        if (err) reject(err);
        else resolve(goal);
      });
    });
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Check if user has access to this goal
    if (req.user.userId !== goal.user_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const listIds = goal.list_ids ? JSON.parse(goal.list_ids) : [];
    const selectedPeriod = (period || date) ? new Date(period || date) : null;
    
    const progress = await calculateMultiPeriodProgress(goal, listIds, selectedPeriod);
    
    res.json({ progress });
  } catch (error) {
    console.error('Error fetching goal progress:', error);
    res.status(500).json({ error: 'Error fetching goal progress' });
  }
});

module.exports = router;
