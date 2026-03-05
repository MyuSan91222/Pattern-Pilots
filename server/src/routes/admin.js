import { Router } from 'express';
import { getDb, getUserActivityStats, getAttendanceHistory } from '../db/database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);

// Helper function to log activity
function logActivity(email, action, detail = null) {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (user) {
    db.prepare(
      'INSERT INTO activity_log (user_id, user_email, action, detail) VALUES (?, ?, ?, ?)'
    ).run(user.id, email, action, detail);
  }
}

// GET /api/admin/users
router.get('/users', (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const db = getDb();

  const where = search ? `WHERE email LIKE ?` : '';
  const params = search ? [`%${search}%`] : [];

  const users = db.prepare(`
    SELECT id, email, role, verified, created_at, last_login, last_logout, activity_count
    FROM users ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params).count;
  res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/admin/users/:id/stats
router.get('/users/:id/stats', (req, res) => {
  const userId = req.params.id;
  const stats = getUserActivityStats(userId);
  const history = getAttendanceHistory(userId, 100);
  
  if (!stats) return res.status(404).json({ error: 'User not found' });
  
  res.json({ stats, history });
});

// GET /api/admin/activity
router.get('/activity', (req, res) => {
  const { page = 1, limit = 50, email = '', user_id = '' } = req.query;
  const offset = (page - 1) * limit;
  const db = getDb();

  let where = '';
  const params = [];
  
  if (email) {
    where = 'WHERE user_email LIKE ?';
    params.push(`%${email}%`);
  }
  
  if (user_id) {
    where = where ? `${where} AND user_id = ?` : 'WHERE user_id = ?';
    params.push(parseInt(user_id));
  }

  const logs = db.prepare(`
    SELECT * FROM activity_log ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM activity_log ${where}`).get(...params).count;
  res.json({ logs, total });
});

// GET /api/admin/attendance
router.get('/attendance', (req, res) => {
  const { user_id = '', page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const db = getDb();
  
  let where = '';
  const params = [];
  
  if (user_id) {
    where = 'WHERE user_id = ?';
    params.push(parseInt(user_id));
  }
  
  const sessions = db.prepare(`
    SELECT * FROM attendance_sessions ${where}
    ORDER BY login_time DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM attendance_sessions ${where}`).get(...params).count;
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_sessions,
      SUM(CASE WHEN logout_time IS NOT NULL THEN duration_minutes ELSE 0 END) as total_minutes,
      AVG(CASE WHEN logout_time IS NOT NULL THEN duration_minutes ELSE 0 END) as avg_minutes
    FROM attendance_sessions ${where}
  `).get(...params);
  
  res.json({ sessions, total, stats, page: parseInt(page), limit: parseInt(limit) });
});

// DELETE /api/admin/activity
router.delete('/activity', (req, res) => {
  const { email } = req.query;
  if (email) {
    getDb().prepare('DELETE FROM activity_log WHERE user_email = ?').run(email);
  } else {
    getDb().prepare('DELETE FROM activity_log').run();
  }
  res.json({ message: 'Activity cleared' });
});

// GET /api/admin/groups - Get all groups for admin management
router.get('/groups', (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    let where = '';
    const params = [];
    
    if (search) {
      where = 'WHERE g.name LIKE ?';
      params.push(`%${search}%`);
    }

    const groups = db.prepare(`
      SELECT 
        g.id,
        g.name,
        g.description,
        g.created_by,
        g.is_suspended,
        g.suspension_reason,
        g.suspended_by,
        g.suspended_at,
        g.is_public,
        g.created_at
      FROM gc_groups g
      ${where}
      ORDER BY g.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    // Enrich groups with member and message counts
    const enrichedGroups = groups.map(g => {
      const memberCount = db.prepare('SELECT COUNT(*) as cnt FROM gc_members WHERE group_id = ?').get(g.id).cnt || 0;
      const messageCount = db.prepare('SELECT COUNT(*) as cnt FROM gc_messages WHERE group_id = ? AND is_deleted = 0').get(g.id).cnt || 0;
      return { ...g, member_count: memberCount, message_count: messageCount };
    });

    const total = db.prepare(`SELECT COUNT(*) as count FROM gc_groups g ${where}`).get(...params).count;
    res.json({ groups: enrichedGroups, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[Admin] GET /groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// GET /api/admin/messages
router.get('/messages', (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const db = getDb();

  let where = '';
  const params = [];
  
  if (search) {
    where = 'WHERE c.item_owner_email LIKE ? OR c.inquirer_email LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  const messages = db.prepare(`
    SELECT 
      c.id as conversation_id,
      c.item_owner_email,
      c.inquirer_email,
      i.title as item_title,
      SUM(CASE WHEN m.sender_email = c.item_owner_email THEN 1 ELSE 0 END) as owner_messages,
      SUM(CASE WHEN m.sender_email = c.item_owner_email AND m.message_enc IS NULL THEN 1 ELSE 0 END) as owner_deleted,
      SUM(CASE WHEN m.sender_email = c.inquirer_email THEN 1 ELSE 0 END) as inquirer_messages,
      SUM(CASE WHEN m.sender_email = c.inquirer_email AND m.message_enc IS NULL THEN 1 ELSE 0 END) as inquirer_deleted,
      MAX(m.created_at) as last_message_at,
      c.created_at
    FROM lf_conversations c
    JOIN lf_items i ON c.item_id = i.id
    LEFT JOIN lf_messages m ON c.id = m.conversation_id
    ${where}
    GROUP BY c.id
    ORDER BY MAX(m.created_at) DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`
    SELECT COUNT(DISTINCT c.id) as count FROM lf_conversations c
    JOIN lf_items i ON c.item_id = i.id
    LEFT JOIN lf_messages m ON c.id = m.conversation_id
    ${where}
  `).get(...params).count;

  res.json({ messages, total, page: parseInt(page), limit: parseInt(limit) });
});

// PUT /api/admin/users/:email/role
router.put('/users/:email/role', (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  getDb().prepare('UPDATE users SET role = ? WHERE email = ?').run(role, req.params.email);
  res.json({ message: 'Role updated' });
});

// DELETE /api/admin/conversations/:conversationId
router.delete('/conversations/:conversationId', (req, res) => {
  const db = getDb();
  try {
    // Delete all messages in the conversation
    db.prepare('DELETE FROM lf_messages WHERE conversation_id = ?').run(req.params.conversationId);
    // Delete the conversation
    db.prepare('DELETE FROM lf_conversations WHERE id = ?').run(req.params.conversationId);
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// POST /api/admin/message-requests
router.post('/message-requests', (req, res) => {
  const db = getDb();
  const { user_email, message } = req.body;
  const admin_email = req.user.email;

  if (!user_email) {
    return res.status(400).json({ error: 'User email required' });
  }

  try {
    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(user_email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Insert or replace message request from admin to user with sender_type = 'admin'
    db.prepare(`
      INSERT INTO admin_message_requests (admin_email, user_email, status, message, sender_type)
      VALUES (?, ?, 'pending', ?, 'admin')
      ON CONFLICT(admin_email, user_email) DO UPDATE SET
        status = 'pending',
        message = ?,
        sender_type = 'admin',
        created_at = datetime('now'),
        responded_at = NULL
    `).run(admin_email, user_email, message || null, message || null);

    res.status(201).json({ success: true, message: 'Request sent' });
  } catch (error) {
    console.error('Error sending message request:', error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// GET /api/admin/message-requests - Get both outgoing (admin→user) and incoming (user→admin) requests
router.get('/message-requests', (req, res) => {
  const db = getDb();
  const admin_email = req.user.email;

  try {
    // Outgoing requests: requests sent BY this admin TO users (sender_type = 'admin')
    const outgoing = db.prepare(`
      SELECT 
        id, admin_email, user_email, status, message, created_at, responded_at,
        'outgoing' as type
      FROM admin_message_requests
      WHERE admin_email = ? AND sender_type = 'admin'
      ORDER BY created_at DESC
    `).all(admin_email);

    // Incoming requests: requests FROM users TO this admin (sender_type = 'user')
    const incoming = db.prepare(`
      SELECT 
        id, admin_email, user_email, status, message, created_at, responded_at,
        'incoming' as type
      FROM admin_message_requests
      WHERE admin_email = ? AND sender_type = 'user'
      ORDER BY created_at DESC
    `).all(admin_email);

    // Combine both types and return with proper type field
    const allRequests = [...outgoing, ...incoming];
    res.json({ requests: allRequests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// DELETE /api/admin/message-requests/:id - Admin deletes their own request
router.delete('/message-requests/:id', (req, res) => {
  const db = getDb();
  const admin_email = req.user.email;

  try {
    const request = db.prepare(`
      SELECT * FROM admin_message_requests WHERE id = ? AND admin_email = ?
    `).get(req.params.id, admin_email);

    if (!request) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    db.prepare('DELETE FROM admin_message_requests WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// PUT /api/admin/message-requests/:id/accept - Admin accepts a user's message request
router.put('/message-requests/:id/accept', (req, res) => {
  const db = getDb();
  const admin_email = req.user.email;

  try {
    const request = db.prepare(`
      SELECT * FROM admin_message_requests WHERE id = ? AND admin_email = ?
    `).get(req.params.id, admin_email);

    if (!request) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only accept pending requests' });
    }

    // Update request status to accepted
    db.prepare(`
      UPDATE admin_message_requests
      SET status = 'accepted', responded_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    // Log activity for admin
    logActivity(admin_email, 'accepted_request', `Accepted request from ${request.user_email}`);
    
    // Log activity for user so they see the acceptance notification
    logActivity(request.user_email, 'request_accepted', `Your message request to admin was accepted`);

    res.json({ success: true, message: 'Request accepted', user_email: request.user_email });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// PUT /api/admin/message-requests/:id/reject - Admin rejects a user's message request
router.put('/message-requests/:id/reject', (req, res) => {
  const db = getDb();
  const admin_email = req.user.email;

  try {
    const request = db.prepare(`
      SELECT * FROM admin_message_requests WHERE id = ? AND admin_email = ?
    `).get(req.params.id, admin_email);

    if (!request) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only reject pending requests' });
    }

    db.prepare(`
      UPDATE admin_message_requests
      SET status = 'rejected', responded_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

export default router;
