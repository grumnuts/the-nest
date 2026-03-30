function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function logAuditEvent(db, eventType, req, details = {}) {
  const userId = req.user?.userId || null;
  const username = req.user?.username || null;
  const ip = getClientIp(req);
  db.addAuditLog(eventType, userId, username, ip, JSON.stringify(details), (err) => {
    if (err) console.error('Audit log error:', err.message);
  });
}

module.exports = { logAuditEvent, getClientIp };
