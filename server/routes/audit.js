const express = require('express');
const { authenticateToken, hasAdminPrivileges } = require('../middleware/auth');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Get audit logs (admin/owner only)
router.get('/', authenticateToken, (req, res) => {
  db.getUserById(req.user.userId, (err, user) => {
    if (err) return res.status(500).json({ error: 'Error checking permissions' });
    if (!user || !hasAdminPrivileges(user)) return res.status(403).json({ error: 'Access denied' });

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    db.countAuditLogs((err, row) => {
      if (err) return res.status(500).json({ error: 'Error counting audit logs' });

      db.getAuditLogs(limit, offset, (err, logs) => {
        if (err) return res.status(500).json({ error: 'Error fetching audit logs' });

        res.json({ logs, total: row.count, limit, offset });
      });
    });
  });
});

module.exports = router;
