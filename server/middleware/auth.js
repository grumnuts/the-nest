const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Validation middleware
const validateLogin = [
  body('username').isLength({ min: 3, max: 30 }).trim().escape(),
  body('password').notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateList = [
  body('name').isLength({ min: 1, max: 100 }).trim().escape(),
  body('description').optional().isLength({ max: 500 }).trim().escape(),
  body('reset_period').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'static']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateTask = [
  body('title').isLength({ min: 1, max: 200 }).trim().escape(),
  body('description').optional().isLength({ max: 1000 }).trim().escape(),
  body('list_id').isInt(),
  body('assigned_to').optional().isInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateGoal = [
  body('list_id').isInt(),
  body('tasks_per_period').isInt({ min: 0 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Helper function to check if user is admin or owner
const checkAdminOrOwner = (req, res, next) => {
  // This will be used in routes to check if user has admin/owner privileges
  // The actual role check will be done in the routes using the user's role from JWT
  next();
};

// Helper function to check if user has admin privileges (admin or owner)
const hasAdminPrivileges = (user) => {
  return user.role === 'admin' || user.role === 'owner' || user.is_admin === 1;
};

// Helper function to check if user has owner privileges
const hasOwnerPrivileges = (user) => {
  return user.role === 'owner';
};

module.exports = {
  authenticateToken,
  validateLogin,
  validateList,
  validateTask,
  validateGoal,
  checkAdminOrOwner,
  hasAdminPrivileges,
  hasOwnerPrivileges,
  JWT_SECRET
};
