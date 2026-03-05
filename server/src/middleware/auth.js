import { verifyAccessToken } from '../utils/auth.js';
import { getDb } from '../db/database.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    req.user = payload;
    // Update last_seen silently — every authenticated request refreshes presence
    try {
      getDb().prepare("UPDATE users SET last_seen = datetime('now') WHERE email = ?").run(payload.email);
    } catch { /* never block the request */ }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    if (req.user.role !== 'admin' && !adminEmails.includes(req.user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}
