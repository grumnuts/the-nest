// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  // If user doesn't exist or is not admin, deny access
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Function to check if a user object is admin
const isAdmin = (user) => {
  return user && user.is_admin;
};

module.exports = {
  checkAdmin,
  isAdmin
};
