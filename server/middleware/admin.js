// Middleware to check if user is admin or owner (uses role field, falls back to is_admin for compatibility)
const checkAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { role, is_admin } = req.user;
  if (role === 'admin' || role === 'owner' || is_admin === 1) {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
};

// Function to check if a user object is admin
const isAdmin = (user) => {
  return user && (user.role === 'admin' || user.role === 'owner' || user.is_admin === 1);
};

module.exports = {
  checkAdmin,
  isAdmin
};
