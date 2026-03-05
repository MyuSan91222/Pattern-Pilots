import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications — latest 30 for current user, unread first
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const notifications = db.prepare(`
      SELECT id, type, title, body, link, is_read, created_at
      FROM notifications
      WHERE user_email = ?
      ORDER BY is_read ASC, created_at DESC
      LIMIT 30
    `).all(req.user.email);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('[Notif] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_email = ?`).run(req.user.email);
    res.json({ success: true });
  } catch (err) {
    console.error('[Notif] read-all error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// PUT /api/notifications/:id/read — mark single notification as read
router.put('/:id/read', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_email = ?`)
      .run(req.params.id, req.user.email);
    res.json({ success: true });
  } catch (err) {
    console.error('[Notif] read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// DELETE /api/notifications/:id — dismiss single notification
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`DELETE FROM notifications WHERE id = ? AND user_email = ?`)
      .run(req.params.id, req.user.email);
    res.json({ success: true });
  } catch (err) {
    console.error('[Notif] delete error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
