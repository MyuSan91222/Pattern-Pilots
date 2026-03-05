import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { getDb, insertNotification } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const router = Router();

const UPLOADS_DIR = join(process.env.HOME || '/tmp', '.attendance-analyzer', 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
      cb(null, `gc_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseMsg(row, userEmail) {
  if (!row) return null;
  const db = getDb();
  const reactions = db.prepare(
    'SELECT emoji, user_email FROM gc_message_reactions WHERE message_id = ?'
  ).all(row.id);

  const replyTo = row.reply_to_id
    ? db.prepare('SELECT id, sender_email, message_text FROM gc_messages WHERE id = ?').get(row.reply_to_id)
    : null;

  return {
    id: row.id,
    group_id: row.group_id,
    sender_email: row.sender_email,
    text: row.is_deleted ? '[Message deleted]' : (row.message_text || ''),
    is_deleted: !!row.is_deleted,
    is_edited: !!row.is_edited,
    edited_at: row.edited_at,
    reply_to: replyTo ? {
      id: replyTo.id,
      sender_email: replyTo.sender_email,
      text: replyTo.message_text ? replyTo.message_text.slice(0, 100) : '[deleted]',
    } : null,
    file_path: row.file_path,
    file_name: row.file_name,
    file_type: row.file_type,
    is_mine: row.sender_email === userEmail,
    reactions,
    created_at: row.created_at,
  };
}

function isMember(db, groupId, email) {
  return !!db.prepare('SELECT id FROM gc_members WHERE group_id = ? AND user_email = ?').get(groupId, email);
}

function getMemberRole(db, groupId, email) {
  const m = db.prepare('SELECT role FROM gc_members WHERE group_id = ? AND user_email = ?').get(groupId, email);
  return m?.role || null;
}

function isAdminOrOwner(db, groupId, email) {
  const role = getMemberRole(db, groupId, email);
  return role === 'owner' || role === 'admin';
}

// ── Groups ─────────────────────────────────────────────────────────────────────

// GET /api/groupchat/groups
router.get('/groups', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const groups = db.prepare(`
      SELECT g.*, gm.role, gm.muted,
             (SELECT COUNT(*) FROM gc_members WHERE group_id = g.id) AS member_count
      FROM gc_groups g
      JOIN gc_members gm ON gm.group_id = g.id AND gm.user_email = ?
      ORDER BY g.created_at DESC
    `).all(req.user.email);

    const result = groups.map(g => {
      const lastMsg = db.prepare(`
        SELECT message_text, sender_email, created_at FROM gc_messages
        WHERE group_id = ? AND is_deleted = 0
        ORDER BY created_at DESC LIMIT 1
      `).get(g.id);

      const readState = db.prepare(`
        SELECT last_read_message_id FROM gc_read_receipts
        WHERE group_id = ? AND user_email = ?
      `).get(g.id, req.user.email);

      const unread = readState?.last_read_message_id
        ? (db.prepare(`
            SELECT COUNT(*) as cnt FROM gc_messages
            WHERE group_id = ? AND id > ? AND is_deleted = 0 AND sender_email != ?
          `).get(g.id, readState.last_read_message_id, req.user.email)?.cnt || 0)
        : (db.prepare(`
            SELECT COUNT(*) as cnt FROM gc_messages
            WHERE group_id = ? AND is_deleted = 0 AND sender_email != ?
          `).get(g.id, req.user.email)?.cnt || 0);

      return {
        ...g,
        last_message: lastMsg ? {
          text: lastMsg.message_text?.slice(0, 80) || '',
          sender_email: lastMsg.sender_email,
          created_at: lastMsg.created_at,
        } : null,
        unread_count: unread,
      };
    });

    res.json({ groups: result });
  } catch (err) {
    console.error('[GC] GET /groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// POST /api/groupchat/groups
router.post('/groups', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { name, description, members = [], avatar_color, is_public = 1 } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });

    const inviteToken = crypto.randomBytes(12).toString('hex');
    const r = db.prepare(`
      INSERT INTO gc_groups (name, description, created_by, avatar_color, invite_token, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), description || '', req.user.email, avatar_color || '#1e3a6e', inviteToken, is_public ? 1 : 0);

    const groupId = r.lastInsertRowid;
    db.prepare(`INSERT INTO gc_members (group_id, user_email, role) VALUES (?, ?, 'owner')`).run(groupId, req.user.email);

    for (const email of (members || []).filter(e => e && e !== req.user.email)) {
      const user = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
      if (user) {
        db.prepare(`INSERT OR IGNORE INTO gc_members (group_id, user_email, role) VALUES (?, ?, 'member')`).run(groupId, email);
      }
    }

    const group = db.prepare(`
      SELECT g.*, gm.role, gm.muted,
             (SELECT COUNT(*) FROM gc_members WHERE group_id = g.id) AS member_count
      FROM gc_groups g
      JOIN gc_members gm ON gm.group_id = g.id AND gm.user_email = ?
      WHERE g.id = ?
    `).get(req.user.email, groupId);

    res.status(201).json({ group: { ...group, unread_count: 0, last_message: null } });
  } catch (err) {
    console.error('[GC] POST /groups error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// GET /api/groupchat/groups/discover?q=...  — search public groups the user hasn't joined
router.get('/groups/discover', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { q = '' } = req.query;
    const search = q.trim();

    let sql = `
      SELECT g.*,
             (SELECT COUNT(*) FROM gc_members WHERE group_id = g.id) AS member_count
      FROM gc_groups g
      WHERE g.is_public = 1
        AND g.id NOT IN (SELECT group_id FROM gc_members WHERE user_email = ?)
    `;
    const params = [req.user.email];

    if (search) {
      sql += ' AND (g.name LIKE ? OR g.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY g.created_at DESC LIMIT 30';

    const groups = db.prepare(sql).all(...params);
    res.json({ groups });
  } catch (err) {
    console.error('[GC] GET /groups/discover error:', err);
    res.status(500).json({ error: 'Failed to discover groups' });
  }
});

// GET /api/groupchat/groups/appeals — admin: list all pending appeals
// MUST be before /groups/:id so Express doesn't match 'appeals' as :id
router.get('/groups/appeals', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT role FROM users WHERE email = ?').get(req.user.email);
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const appeals = db.prepare(`
      SELECT a.*, g.name AS group_name, g.suspension_reason, g.suspended_at
      FROM gc_suspension_appeals a
      JOIN gc_groups g ON g.id = a.group_id
      WHERE a.status = 'pending'
      ORDER BY a.created_at ASC
    `).all();

    res.json({ appeals });
  } catch (err) {
    console.error('[GC] GET /groups/appeals error:', err);
    res.status(500).json({ error: 'Failed to fetch appeals' });
  }
});

// PUT /api/groupchat/groups/appeals/:appealId — admin: approve or reject an appeal
// MUST be before /groups/:id
router.put('/groups/appeals/:appealId', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT role FROM users WHERE email = ?').get(req.user.email);
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { action, admin_note } = req.body;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "action must be 'approve' or 'reject'" });

    const appeal = db.prepare('SELECT * FROM gc_suspension_appeals WHERE id = ?').get(req.params.appealId);
    if (!appeal) return res.status(404).json({ error: 'Appeal not found' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    db.prepare(`
      UPDATE gc_suspension_appeals
      SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, admin_note || null, req.user.email, req.params.appealId);

    if (action === 'approve') {
      db.prepare(`
        UPDATE gc_groups SET is_suspended = 0, suspension_reason = NULL, suspended_by = NULL, suspended_at = NULL
        WHERE id = ?
      `).run(appeal.group_id);
    }

    res.json({ success: true, message: `Appeal ${newStatus}` });
  } catch (err) {
    console.error('[GC] PUT /groups/appeals/:appealId error:', err);
    res.status(500).json({ error: 'Failed to update appeal' });
  }
});

// GET /api/groupchat/groups/:id
router.get('/groups/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const group = db.prepare('SELECT * FROM gc_groups WHERE id = ?').get(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const members = db.prepare(`
      SELECT gm.user_email, gm.role, gm.muted, gm.joined_at
      FROM gc_members gm
      WHERE gm.group_id = ?
      ORDER BY CASE gm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
    `).all(req.params.id);

    const pinnedCount = db.prepare('SELECT COUNT(*) as cnt FROM gc_pinned_messages WHERE group_id = ?').get(req.params.id)?.cnt || 0;
    const myRole = getMemberRole(db, req.params.id, req.user.email);

    res.json({ group: { ...group, members, pinned_count: pinnedCount, my_role: myRole } });
  } catch (err) {
    console.error('[GC] GET /groups/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// PUT /api/groupchat/groups/:id
router.put('/groups/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isAdminOrOwner(db, req.params.id, req.user.email))
      return res.status(403).json({ error: 'Only admins can update group' });

    const { name, description, avatar_color, is_public } = req.body;
    const updates = []; const params = [];
    if (name) { updates.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (avatar_color) { updates.push('avatar_color = ?'); params.push(avatar_color); }
    if (is_public !== undefined) { updates.push('is_public = ?'); params.push(is_public ? 1 : 0); }

    if (updates.length) {
      params.push(req.params.id);
      db.prepare(`UPDATE gc_groups SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] PUT /groups/:id error:', err);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// DELETE /api/groupchat/groups/:id
router.delete('/groups/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (getMemberRole(db, req.params.id, req.user.email) !== 'owner')
      return res.status(403).json({ error: 'Only owner can delete group' });
    db.prepare('DELETE FROM gc_groups WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] DELETE /groups/:id error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// PUT /api/groupchat/groups/:id/suspend - Admin only
router.put('/groups/:id/suspend', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT role FROM users WHERE email = ?').get(req.user.email);
    
    // Only admins can suspend groups
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can suspend groups' });
    }
    
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason required' });
    }
    
    db.prepare(`
      UPDATE gc_groups 
      SET is_suspended = 1, suspension_reason = ?, suspended_by = ?, suspended_at = datetime('now')
      WHERE id = ?
    `).run(reason, req.user.email, req.params.id);
    
    res.json({ success: true, message: `Group suspended for: ${reason}` });
  } catch (err) {
    console.error('[GC] PUT /groups/:id/suspend error:', err);
    res.status(500).json({ error: 'Failed to suspend group' });
  }
});

// PUT /api/groupchat/groups/:id/unsuspend - Admin only
router.put('/groups/:id/unsuspend', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT role FROM users WHERE email = ?').get(req.user.email);
    
    // Only admins can unsuspend groups
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can unsuspend groups' });
    }
    
    db.prepare(`
      UPDATE gc_groups 
      SET is_suspended = 0, suspension_reason = NULL, suspended_by = NULL, suspended_at = NULL
      WHERE id = ?
    `).run(req.params.id);
    
    res.json({ success: true, message: 'Group unsuspended' });
  } catch (err) {
    console.error('[GC] PUT /groups/:id/unsuspend error:', err);
    res.status(500).json({ error: 'Failed to unsuspend group' });
  }
});

// POST /api/groupchat/groups/:id/leave
router.post('/groups/:id/leave', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const role = getMemberRole(db, req.params.id, req.user.email);
    if (!role) return res.status(404).json({ error: 'Not a member' });

    // Owners can only leave if the group is suspended (they choose to abandon it)
    if (role === 'owner') {
      const group = db.prepare('SELECT is_suspended FROM gc_groups WHERE id = ?').get(req.params.id);
      if (!group?.is_suspended) {
        return res.status(400).json({ error: 'Owner must delete the group instead' });
      }
    }

    db.prepare('DELETE FROM gc_members WHERE group_id = ? AND user_email = ?').run(req.params.id, req.user.email);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] POST /groups/:id/leave error:', err);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// POST /api/groupchat/groups/:id/appeal — founder submits unsuspension appeal
router.post('/groups/:id/appeal', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const group = db.prepare('SELECT * FROM gc_groups WHERE id = ?').get(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!group.is_suspended) return res.status(400).json({ error: 'Group is not suspended' });

    const role = getMemberRole(db, req.params.id, req.user.email);
    if (role !== 'owner') return res.status(403).json({ error: 'Only the group founder can submit an appeal' });

    const { appeal_text } = req.body;
    if (!appeal_text?.trim()) return res.status(400).json({ error: 'Appeal text is required' });

    // Check for existing pending appeal
    const existing = db.prepare(
      "SELECT id FROM gc_suspension_appeals WHERE group_id = ? AND founder_email = ? AND status = 'pending'"
    ).get(req.params.id, req.user.email);
    if (existing) return res.status(409).json({ error: 'You already have a pending appeal for this group' });

    const r = db.prepare(`
      INSERT INTO gc_suspension_appeals (group_id, founder_email, appeal_text)
      VALUES (?, ?, ?)
    `).run(req.params.id, req.user.email, appeal_text.trim());

    res.status(201).json({ success: true, appeal_id: r.lastInsertRowid, message: 'Appeal submitted — admins will review it shortly' });
  } catch (err) {
    console.error('[GC] POST /groups/:id/appeal error:', err);
    res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

// GET /api/groupchat/groups/:id/appeal — get founder's appeal status
router.get('/groups/:id/appeal', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const appeal = db.prepare(`
      SELECT * FROM gc_suspension_appeals
      WHERE group_id = ? AND founder_email = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(req.params.id, req.user.email);

    res.json({ appeal: appeal || null });
  } catch (err) {
    console.error('[GC] GET /groups/:id/appeal error:', err);
    res.status(500).json({ error: 'Failed to fetch appeal' });
  }
});

// PUT /api/groupchat/groups/:id/transfer-owner — founder transfers ownership to another member
router.put('/groups/:id/transfer-owner', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const role = getMemberRole(db, req.params.id, req.user.email);
    if (role !== 'owner') return res.status(403).json({ error: 'Only the group owner can transfer ownership' });

    const { new_owner_email } = req.body;
    if (!new_owner_email) return res.status(400).json({ error: 'new_owner_email is required' });
    if (new_owner_email === req.user.email) return res.status(400).json({ error: 'Cannot transfer ownership to yourself' });

    const newOwnerMember = db.prepare('SELECT role FROM gc_members WHERE group_id = ? AND user_email = ?').get(req.params.id, new_owner_email);
    if (!newOwnerMember) return res.status(404).json({ error: 'Target user is not a member of this group' });

    // Demote current owner to member, promote new owner
    db.prepare("UPDATE gc_members SET role = 'member' WHERE group_id = ? AND user_email = ?").run(req.params.id, req.user.email);
    db.prepare("UPDATE gc_members SET role = 'owner' WHERE group_id = ? AND user_email = ?").run(req.params.id, new_owner_email);
    db.prepare("UPDATE gc_groups SET created_by = ? WHERE id = ?").run(new_owner_email, req.params.id);

    res.json({ success: true, message: `Ownership transferred to ${new_owner_email}` });
  } catch (err) {
    console.error('[GC] PUT /groups/:id/transfer-owner error:', err);
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

// GET /api/groupchat/groups/:id/export — export group messages for the founder
router.get('/groups/:id/export', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const role = getMemberRole(db, req.params.id, req.user.email);
    if (!role) return res.status(403).json({ error: 'Not a member' });
    if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Only owner or admin can export group data' });

    const group = db.prepare('SELECT id, name, description, created_by, is_public, is_suspended, suspension_reason, suspended_at, created_at FROM gc_groups WHERE id = ?').get(req.params.id);
    const members = db.prepare("SELECT user_email, role, joined_at FROM gc_members WHERE group_id = ? ORDER BY role DESC, joined_at ASC").all(req.params.id);
    const messages = db.prepare(`
      SELECT sender_email, message_text, file_name, is_edited, is_deleted, created_at
      FROM gc_messages WHERE group_id = ? ORDER BY created_at ASC
    `).all(req.params.id);

    const exportData = {
      exported_at: new Date().toISOString(),
      exported_by: req.user.email,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        founder: group.created_by,
        visibility: group.is_public ? 'Public' : 'Private',
        is_suspended: !!group.is_suspended,
        suspension_reason: group.suspension_reason || null,
        suspended_at: group.suspended_at || null,
        created_at: group.created_at,
      },
      members: members.map(m => ({ email: m.user_email, role: m.role, joined_at: m.joined_at })),
      messages: messages.map(m => ({
        sender: m.sender_email,
        text: m.is_deleted ? '[Message deleted]' : (m.message_text || ''),
        file: m.file_name || null,
        edited: !!m.is_edited,
        sent_at: m.created_at,
      })),
    };

    res.setHeader('Content-Disposition', `attachment; filename="group_${group.id}_export.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    console.error('[GC] GET /groups/:id/export error:', err);
    res.status(500).json({ error: 'Failed to export group data' });
  }
});

// POST /api/groupchat/groups/:id/join  — direct join for discovered public groups
router.post('/groups/:id/join', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const group = db.prepare('SELECT * FROM gc_groups WHERE id = ?').get(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!group.is_public) return res.status(403).json({ error: 'This is a private group' });

    const alreadyMember = isMember(db, group.id, req.user.email);
    if (!alreadyMember) {
      db.prepare(`INSERT OR IGNORE INTO gc_members (group_id, user_email, role) VALUES (?, ?, 'member')`).run(group.id, req.user.email);
    }
    const updated = db.prepare(`
      SELECT g.*, gm.role, gm.muted,
             (SELECT COUNT(*) FROM gc_members WHERE group_id = g.id) AS member_count
      FROM gc_groups g
      JOIN gc_members gm ON gm.group_id = g.id AND gm.user_email = ?
      WHERE g.id = ?
    `).get(req.user.email, group.id);

    res.json({ success: true, group: { ...updated, unread_count: 0, last_message: null }, already_member: alreadyMember });
  } catch (err) {
    console.error('[GC] POST /groups/:id/join error:', err);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// GET /api/groupchat/groups/:id/join-requests  (owner/admin only)
router.get('/groups/:id/join-requests', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isAdminOrOwner(db, req.params.id, req.user.email))
      return res.status(403).json({ error: 'Only admins can view join requests' });

    const requests = db.prepare(`
      SELECT jr.id, jr.group_id, jr.requester_email, jr.status, jr.created_at
      FROM gc_join_requests jr
      WHERE jr.group_id = ? AND jr.status = 'pending'
      ORDER BY jr.created_at ASC
    `).all(req.params.id);

    res.json({ requests });
  } catch (err) {
    console.error('[GC] GET /groups/:id/join-requests error:', err);
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
});

// POST /api/groupchat/groups/:id/join-requests/:requestId/approve
router.post('/groups/:id/join-requests/:requestId/approve', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isAdminOrOwner(db, req.params.id, req.user.email))
      return res.status(403).json({ error: 'Only admins can approve requests' });

    const request = db.prepare('SELECT * FROM gc_join_requests WHERE id = ? AND group_id = ?').get(req.params.requestId, req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    db.prepare(`UPDATE gc_join_requests SET status = 'approved' WHERE id = ?`).run(request.id);
    db.prepare(`INSERT OR IGNORE INTO gc_members (group_id, user_email, role) VALUES (?, ?, 'member')`).run(req.params.id, request.requester_email);

    const group = db.prepare('SELECT name FROM gc_groups WHERE id = ?').get(req.params.id);
    insertNotification(db, request.requester_email, 'join_approved',
      'Join request approved',
      `You have been added to "${group?.name || 'the group'}".`,
      '/group-chat'
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[GC] POST approve error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// POST /api/groupchat/groups/:id/join-requests/:requestId/reject
router.post('/groups/:id/join-requests/:requestId/reject', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isAdminOrOwner(db, req.params.id, req.user.email))
      return res.status(403).json({ error: 'Only admins can reject requests' });

    const request = db.prepare('SELECT * FROM gc_join_requests WHERE id = ? AND group_id = ?').get(req.params.requestId, req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    db.prepare(`UPDATE gc_join_requests SET status = 'rejected' WHERE id = ?`).run(request.id);

    const group = db.prepare('SELECT name FROM gc_groups WHERE id = ?').get(req.params.id);
    insertNotification(db, request.requester_email, 'join_rejected',
      'Join request declined',
      `Your request to join "${group?.name || 'the group'}" was declined.`,
      '/group-chat'
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[GC] POST reject error:', err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// ── Members ────────────────────────────────────────────────────────────────────

// POST /api/groupchat/groups/:id/members
router.post('/groups/:id/members', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isAdminOrOwner(db, req.params.id, req.user.email))
      return res.status(403).json({ error: 'Only admins can add members' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare(`INSERT OR IGNORE INTO gc_members (group_id, user_email, role) VALUES (?, ?, 'member')`).run(req.params.id, email);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] POST /groups/:id/members error:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// DELETE /api/groupchat/groups/:id/members/:email
router.delete('/groups/:id/members/:email', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const requesterRole = getMemberRole(db, req.params.id, req.user.email);
    if (!requesterRole) return res.status(403).json({ error: 'Not a member' });

    const targetEmail = decodeURIComponent(req.params.email);
    if (targetEmail !== req.user.email) {
      if (requesterRole !== 'owner' && requesterRole !== 'admin')
        return res.status(403).json({ error: 'Only admins can remove members' });
      if (getMemberRole(db, req.params.id, targetEmail) === 'owner')
        return res.status(403).json({ error: 'Cannot remove group owner' });
    }
    db.prepare('DELETE FROM gc_members WHERE group_id = ? AND user_email = ?').run(req.params.id, targetEmail);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] DELETE /groups/:id/members/:email error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// PUT /api/groupchat/groups/:id/members/:email/role
router.put('/groups/:id/members/:email/role', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (getMemberRole(db, req.params.id, req.user.email) !== 'owner')
      return res.status(403).json({ error: 'Only owner can change roles' });

    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const targetEmail = decodeURIComponent(req.params.email);
    db.prepare('UPDATE gc_members SET role = ? WHERE group_id = ? AND user_email = ?').run(role, req.params.id, targetEmail);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] PUT /groups/:id/members/:email/role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// PUT /api/groupchat/groups/:id/mute
router.put('/groups/:id/mute', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const current = db.prepare('SELECT muted FROM gc_members WHERE group_id = ? AND user_email = ?').get(req.params.id, req.user.email);
    const newMuted = current?.muted ? 0 : 1;
    db.prepare('UPDATE gc_members SET muted = ? WHERE group_id = ? AND user_email = ?').run(newMuted, req.params.id, req.user.email);
    res.json({ success: true, muted: !!newMuted });
  } catch (err) {
    console.error('[GC] PUT /groups/:id/mute error:', err);
    res.status(500).json({ error: 'Failed to toggle mute' });
  }
});

// ── Messages ───────────────────────────────────────────────────────────────────

// GET /api/groupchat/groups/:id/messages
router.get('/groups/:id/messages', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const { before, limit = 60, search } = req.query;
    let sql = 'SELECT * FROM gc_messages WHERE group_id = ?';
    const params = [req.params.id];

    if (search?.trim()) { sql += ' AND message_text LIKE ?'; params.push(`%${search.trim()}%`); }
    if (before) { sql += ' AND id < ?'; params.push(parseInt(before)); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const rows = db.prepare(sql).all(...params).reverse();
    res.json({ messages: rows.map(r => parseMsg(r, req.user.email)) });
  } catch (err) {
    console.error('[GC] GET /groups/:id/messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/groupchat/groups/:id/messages
router.post('/groups/:id/messages', requireAuth, upload.single('file'), (req, res) => {
  try {
    const db = getDb();
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const { text, reply_to_id } = req.body;
    const file = req.file;
    if (!text?.trim() && !file) return res.status(400).json({ error: 'Text or file required' });

    const r = db.prepare(`
      INSERT INTO gc_messages (group_id, sender_email, message_text, reply_to_id, file_path, file_name, file_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id, req.user.email,
      text?.trim() || null,
      reply_to_id ? parseInt(reply_to_id) : null,
      file ? `/uploads/${file.filename}` : null,
      file ? file.originalname : null,
      file ? file.mimetype : null,
    );

    // Clear typing indicator for sender
    db.prepare('DELETE FROM gc_typing WHERE group_id = ? AND user_email = ?').run(req.params.id, req.user.email);

    const saved = db.prepare('SELECT * FROM gc_messages WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).json({ message: parseMsg(saved, req.user.email) });
  } catch (err) {
    console.error('[GC] POST /groups/:id/messages error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/groupchat/messages/:id
router.put('/messages/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const msg = db.prepare('SELECT * FROM gc_messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_email !== req.user.email) return res.status(403).json({ error: 'Not your message' });

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

    db.prepare(`UPDATE gc_messages SET message_text = ?, is_edited = 1, edited_at = datetime('now') WHERE id = ?`).run(text.trim(), req.params.id);
    const updated = db.prepare('SELECT * FROM gc_messages WHERE id = ?').get(req.params.id);
    res.json({ message: parseMsg(updated, req.user.email) });
  } catch (err) {
    console.error('[GC] PUT /messages/:id error:', err);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// DELETE /api/groupchat/messages/:id
router.delete('/messages/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const msg = db.prepare('SELECT * FROM gc_messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const canDelete = msg.sender_email === req.user.email || isAdminOrOwner(db, msg.group_id, req.user.email);
    if (!canDelete) return res.status(403).json({ error: 'Not authorized' });

    db.prepare('UPDATE gc_messages SET is_deleted = 1, message_text = NULL WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] DELETE /messages/:id error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ── Reactions ──────────────────────────────────────────────────────────────────

// POST /api/groupchat/messages/:id/reactions
router.post('/messages/:id/reactions', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji required' });

    const msg = db.prepare('SELECT * FROM gc_messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (!isMember(db, msg.group_id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const existing = db.prepare(`
      SELECT id FROM gc_message_reactions WHERE message_id = ? AND user_email = ? AND emoji = ?
    `).get(req.params.id, req.user.email, emoji);

    if (existing) {
      db.prepare('DELETE FROM gc_message_reactions WHERE id = ?').run(existing.id);
    } else {
      db.prepare(`INSERT OR IGNORE INTO gc_message_reactions (message_id, user_email, emoji) VALUES (?, ?, ?)`).run(req.params.id, req.user.email, emoji);
    }

    const reactions = db.prepare('SELECT emoji, user_email FROM gc_message_reactions WHERE message_id = ?').all(req.params.id);
    res.json({ success: true, reactions });
  } catch (err) {
    console.error('[GC] POST /messages/:id/reactions error:', err);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// ── Pinned Messages ────────────────────────────────────────────────────────────

// GET /api/groupchat/groups/:id/pins
router.get('/groups/:id/pins', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const pins = db.prepare(`
      SELECT p.*, m.message_text, m.sender_email AS msg_sender, m.created_at AS msg_created_at
      FROM gc_pinned_messages p
      JOIN gc_messages m ON m.id = p.message_id
      WHERE p.group_id = ?
      ORDER BY p.pinned_at DESC
    `).all(req.params.id);

    res.json({ pins });
  } catch (err) {
    console.error('[GC] GET /groups/:id/pins error:', err);
    res.status(500).json({ error: 'Failed to fetch pins' });
  }
});

// POST /api/groupchat/groups/:id/pin/:messageId
router.post('/groups/:id/pin/:messageId', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isAdminOrOwner(db, req.params.id, req.user.email))
      return res.status(403).json({ error: 'Only admins can pin messages' });

    db.prepare(`INSERT OR IGNORE INTO gc_pinned_messages (group_id, message_id, pinned_by) VALUES (?, ?, ?)`).run(req.params.id, req.params.messageId, req.user.email);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] POST pin error:', err);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// DELETE /api/groupchat/groups/:id/pin/:messageId
router.delete('/groups/:id/pin/:messageId', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isAdminOrOwner(db, req.params.id, req.user.email))
      return res.status(403).json({ error: 'Only admins can unpin messages' });

    db.prepare('DELETE FROM gc_pinned_messages WHERE group_id = ? AND message_id = ?').run(req.params.id, req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] DELETE pin error:', err);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

// ── Read Receipts ──────────────────────────────────────────────────────────────

// POST /api/groupchat/groups/:id/read
router.post('/groups/:id/read', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { message_id } = req.body;
    db.prepare(`
      INSERT INTO gc_read_receipts (group_id, user_email, last_read_message_id, last_read_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(group_id, user_email) DO UPDATE SET
        last_read_message_id = excluded.last_read_message_id,
        last_read_at = excluded.last_read_at
    `).run(req.params.id, req.user.email, message_id);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] POST /groups/:id/read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// GET /api/groupchat/groups/:id/read
router.get('/groups/:id/read', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const receipts = db.prepare(`
      SELECT user_email, last_read_message_id, last_read_at FROM gc_read_receipts WHERE group_id = ?
    `).all(req.params.id);

    res.json({ receipts });
  } catch (err) {
    console.error('[GC] GET /groups/:id/read error:', err);
    res.status(500).json({ error: 'Failed to fetch read receipts' });
  }
});

// ── Typing Indicators ──────────────────────────────────────────────────────────

// POST /api/groupchat/groups/:id/typing
router.post('/groups/:id/typing', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const { is_typing } = req.body;
    if (is_typing) {
      db.prepare(`
        INSERT INTO gc_typing (group_id, user_email, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(group_id, user_email) DO UPDATE SET updated_at = datetime('now')
      `).run(req.params.id, req.user.email);
    } else {
      db.prepare('DELETE FROM gc_typing WHERE group_id = ? AND user_email = ?').run(req.params.id, req.user.email);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] POST /groups/:id/typing error:', err);
    res.status(500).json({ error: 'Failed to update typing status' });
  }
});

// GET /api/groupchat/groups/:id/typing
router.get('/groups/:id/typing', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`DELETE FROM gc_typing WHERE group_id = ? AND updated_at < datetime('now', '-5 seconds')`).run(req.params.id);
    const typing = db.prepare(`SELECT user_email FROM gc_typing WHERE group_id = ? AND user_email != ?`).all(req.params.id, req.user.email);
    res.json({ typing: typing.map(t => t.user_email) });
  } catch (err) {
    console.error('[GC] GET /groups/:id/typing error:', err);
    res.status(500).json({ error: 'Failed to fetch typing users' });
  }
});

// ── Invite Links ───────────────────────────────────────────────────────────────

// POST /api/groupchat/groups/:id/invite-link
router.post('/groups/:id/invite-link', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isAdminOrOwner(db, req.params.id, req.user.email))
      return res.status(403).json({ error: 'Only admins can manage invite links' });

    const token = crypto.randomBytes(12).toString('hex');
    db.prepare('UPDATE gc_groups SET invite_token = ? WHERE id = ?').run(token, req.params.id);
    res.json({ invite_token: token });
  } catch (err) {
    console.error('[GC] POST invite-link error:', err);
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
});

// GET /api/groupchat/groups/:id/invite-link
router.get('/groups/:id/invite-link', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (!isMember(db, req.params.id, req.user.email)) return res.status(403).json({ error: 'Not a member' });

    const group = db.prepare('SELECT invite_token FROM gc_groups WHERE id = ?').get(req.params.id);
    res.json({ invite_token: group?.invite_token || null });
  } catch (err) {
    console.error('[GC] GET invite-link error:', err);
    res.status(500).json({ error: 'Failed to get invite link' });
  }
});

// POST /api/groupchat/join/:token
router.post('/join/:token', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const group = db.prepare('SELECT * FROM gc_groups WHERE invite_token = ?').get(req.params.token);
    if (!group) return res.status(404).json({ error: 'Invalid or expired invite link' });

    const alreadyMember = isMember(db, group.id, req.user.email);
    if (alreadyMember) {
      return res.json({ success: true, group_id: group.id, group_name: group.name, already_member: true });
    }

    // Private group → create a join request instead of instant join
    if (!group.is_public) {
      const existing = db.prepare('SELECT * FROM gc_join_requests WHERE group_id = ? AND requester_email = ?').get(group.id, req.user.email);
      if (existing && existing.status === 'pending') {
        return res.json({ pending: true, group_name: group.name, message: 'Your request is already pending approval' });
      }
      // Upsert request
      db.prepare(`
        INSERT INTO gc_join_requests (group_id, requester_email, status)
        VALUES (?, ?, 'pending')
        ON CONFLICT(group_id, requester_email) DO UPDATE SET status = 'pending', created_at = datetime('now')
      `).run(group.id, req.user.email);
      return res.json({ pending: true, group_id: group.id, group_name: group.name, message: 'Join request submitted — waiting for owner approval' });
    }

    // Public group → instant join
    db.prepare(`INSERT OR IGNORE INTO gc_members (group_id, user_email, role) VALUES (?, ?, 'member')`).run(group.id, req.user.email);
    res.json({ success: true, group_id: group.id, group_name: group.name, already_member: false });
  } catch (err) {
    console.error('[GC] POST /join/:token error:', err);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// ── User Search ────────────────────────────────────────────────────────────────

// GET /api/groupchat/users/search
router.get('/users/search', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { q = '' } = req.query;
    if (!q.trim()) return res.json({ users: [] });

    const users = db.prepare(`
      SELECT email, role FROM users
      WHERE email LIKE ? AND email != ?
      LIMIT 20
    `).all(`%${q.trim()}%`, req.user.email);

    res.json({ users });
  } catch (err) {
    console.error('[GC] GET /users/search error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/groupchat/users/all  (admin only)
router.get('/users/all', requireAuth, (req, res) => {
  try {
    const db = getDb();
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const users = db.prepare(`
      SELECT email, role, created_at FROM users
      WHERE email != ?
      ORDER BY role DESC, email ASC
    `).all(req.user.email);

    res.json({ users });
  } catch (err) {
    console.error('[GC] GET /users/all error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── Video Call Signals ────────────────────────────────────────────────────────

// POST /api/groupchat/groups/:id/call — caller signals an active call in the group
router.post('/groups/:id/call', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const role = getMemberRole(db, req.params.id, req.user.email);
    if (!role) return res.status(403).json({ error: 'Not a member' });

    db.prepare(`
      INSERT INTO gc_call_signals (group_id, caller_email, started_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(group_id) DO UPDATE SET caller_email = excluded.caller_email, started_at = excluded.started_at
    `).run(req.params.id, req.user.email);

    res.json({ success: true });
  } catch (err) {
    console.error('[GC] POST /groups/:id/call error:', err);
    res.status(500).json({ error: 'Failed to signal call' });
  }
});

// DELETE /api/groupchat/groups/:id/call — caller ends the call signal
router.delete('/groups/:id/call', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`
      DELETE FROM gc_call_signals WHERE group_id = ? AND caller_email = ?
    `).run(req.params.id, req.user.email);
    res.json({ success: true });
  } catch (err) {
    console.error('[GC] DELETE /groups/:id/call error:', err);
    res.status(500).json({ error: 'Failed to end call signal' });
  }
});

// GET /api/groupchat/groups/calls — get active incoming calls for current user (excludes own calls, stale >45s)
router.get('/groups/calls', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const calls = db.prepare(`
      SELECT cs.group_id, cs.caller_email, cs.started_at,
             g.name AS group_name, g.avatar_color, g.invite_token
      FROM gc_call_signals cs
      JOIN gc_groups g ON g.id = cs.group_id
      JOIN gc_members m ON m.group_id = cs.group_id AND m.user_email = ?
      WHERE cs.caller_email != ?
        AND cs.started_at >= datetime('now', '-45 seconds')
    `).all(req.user.email, req.user.email);
    res.json({ calls });
  } catch (err) {
    console.error('[GC] GET /groups/calls error:', err);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

export default router;
