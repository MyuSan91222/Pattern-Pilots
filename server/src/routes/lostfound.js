import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { getDb, insertNotification } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

const router = Router();

// ── Uploads directory ──────────────────────────────────────────────────────────
const UPLOADS_DIR = join(process.env.HOME || '/tmp', '.attendance-analyzer', 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Multer config ──────────────────────────────────────────────────────────────
// ── Multer config ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    cb(null, `lf_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

const uploadMessage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB for messages
});

// ── Encryption ─────────────────────────────────────────────────────────────────
// 32-byte AES-256-GCM key derived from env or a stable dev seed
const ENCRYPTION_KEY = process.env.LF_ENCRYPTION_KEY
  ? Buffer.from(process.env.LF_ENCRYPTION_KEY, 'hex')
  : crypto.scryptSync('pattern-pilots-lf-2024', 'pp-static-salt-v1', 32);

function encryptMessage(plaintext) {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  return {
    message_enc: enc,
    iv: iv.toString('hex'),
    auth_tag: cipher.getAuthTag().toString('hex'),
  };
}

function decryptMessage(message_enc, ivHex, authTagHex) {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let dec = decipher.update(message_enc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch {
    return '[Message unavailable]';
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function purgeOldMessages() {
  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  getDb().prepare('DELETE FROM lf_messages WHERE created_at < ?').run(cutoff);
}

function safeDeleteFile(filename) {
  if (!filename) return;
  try { unlinkSync(join(UPLOADS_DIR, filename)); } catch {}
}

function parseItem(row) {
  if (!row) return null;
  return {
    ...row,
    tags: (() => { try { return JSON.parse(row.tags || '[]'); } catch { return []; } })(),
  };
}

// ── Items ──────────────────────────────────────────────────────────────────────

// GET /api/lostfound/items
router.get('/items', (req, res) => {
  try {
    const db = getDb();
    const { category, type, search } = req.query;

    let sql = 'SELECT * FROM lf_items';
    const conditions = [];
    const params = [];

    if (category) { conditions.push('category = ?'); params.push(category); }
    if (type && type !== 'all') {
      if (type === 'resolved') {
        conditions.push('status = ?'); params.push('resolved');
      } else {
        conditions.push('type = ? AND status = ?'); params.push(type, 'active');
      }
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';

    let items = db.prepare(sql).all(...params).map(parseItem);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q) ||
        (i.contact_name || '').toLowerCase().includes(q) ||
        (i.tags || []).some(t => t.toLowerCase().includes(q)),
      );
    }

    res.json({ items });
  } catch (err) {
    console.error('[LF] GET /items error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/lostfound/items/:id
router.get('/items/:id', (req, res) => {
  try {
    const item = parseItem(getDb().prepare('SELECT * FROM lf_items WHERE id = ?').get(req.params.id));
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  } catch (err) {
    console.error('[LF] GET /items/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/lostfound/items  (multipart/form-data)
router.post('/items', requireAuth, upload.single('image'), (req, res) => {
  try {
    const db = getDb();
    const { type, title, description, category, location, item_date,
            contact_name, contact_email, tags, reward } = req.body;

    if (!type || !title) {
      safeDeleteFile(req.file?.filename);
      return res.status(400).json({ error: 'type and title are required' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(req.user.email);

    // tags can arrive as JSON string or comma-separated
    let tagsArr = [];
    if (tags) {
      try { tagsArr = JSON.parse(tags); }
      catch { tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean); }
    }

    const result = db.prepare(`
      INSERT INTO lf_items
        (user_id, user_email, type, title, description, category, location,
         item_date, contact_name, contact_email, tags, reward, image_filename)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user?.id ?? null, req.user.email, type, title,
      description || '', category || 'other', location || '',
      item_date || new Date().toISOString().split('T')[0],
      contact_name || '', contact_email || req.user.email,
      JSON.stringify(tagsArr), reward ? Number(reward) : 0,
      req.file?.filename ?? null,
    );

    const item = parseItem(db.prepare('SELECT * FROM lf_items WHERE id = ?').get(result.lastInsertRowid));
    res.status(201).json({ item });
  } catch (err) {
    safeDeleteFile(req.file?.filename);
    console.error('[LF] POST /items error:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/lostfound/items/:id/resolve
router.put('/items/:id/resolve', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare('SELECT * FROM lf_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.user_email !== req.user.email && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });
    db.prepare('UPDATE lf_items SET status = ? WHERE id = ?').run('resolved', req.params.id);
    res.json({ message: 'Marked as resolved' });
  } catch (err) {
    console.error('[LF] PUT /items/:id/resolve error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/lostfound/items/:id
router.delete('/items/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare('SELECT * FROM lf_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.user_email !== req.user.email && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });
    safeDeleteFile(item.image_filename);
    db.prepare('DELETE FROM lf_items WHERE id = ?').run(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('[LF] DELETE /items/:id error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// GET /api/lostfound/my-items
router.get('/my-items', requireAuth, (req, res) => {
  try {
    const items = getDb()
      .prepare('SELECT * FROM lf_items WHERE user_email = ? ORDER BY created_at DESC')
      .all(req.user.email)
      .map(parseItem);
    res.json({ items });
  } catch (err) {
    console.error('[LF] GET /my-items error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// ── Conversations ──────────────────────────────────────────────────────────────

// POST /api/lostfound/conversations  — start or retrieve existing conversation
router.post('/conversations', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id is required' });

    const item = db.prepare('SELECT * FROM lf_items WHERE id = ?').get(item_id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.user_email === req.user.email)
      return res.status(400).json({ error: 'Cannot chat with yourself about your own listing' });

    let conv = db.prepare(
      'SELECT * FROM lf_conversations WHERE item_id = ? AND inquirer_email = ?'
    ).get(item_id, req.user.email);

    if (!conv) {
      const r = db.prepare(
        'INSERT INTO lf_conversations (item_id, item_owner_email, inquirer_email) VALUES (?, ?, ?)'
      ).run(item_id, item.user_email, req.user.email);
      conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(r.lastInsertRowid);
    }

    res.json({ conversation: { ...conv, item: parseItem(item) } });
  } catch (err) {
    console.error('[LF] POST /conversations error:', err);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// GET /api/lostfound/conversations
router.get('/conversations', requireAuth, (req, res) => {
  try {
    purgeOldMessages();
    const db = getDb();

    const convs = db.prepare(`
      SELECT c.*,
             i.title        AS item_title,
             i.type         AS item_type,
             i.category     AS item_category,
             i.image_filename AS item_image,
             i.status       AS item_status
      FROM lf_conversations c
      LEFT JOIN lf_items i ON c.item_id = i.id
      WHERE c.item_owner_email = ? OR c.inquirer_email = ?
      ORDER BY c.created_at DESC
    `).all(req.user.email, req.user.email);

    console.log('[LF] GET /conversations - found', convs.length, 'conversations for user:', req.user.email);

    const result = convs.map(conv => {
      const last = db.prepare(`
        SELECT sender_email, message_enc, iv, auth_tag, created_at
        FROM lf_messages WHERE conversation_id = ? AND is_deleted = 0
        ORDER BY created_at DESC LIMIT 1
      `).get(conv.id);

      return {
        ...conv,
        item_title: conv.item_title || 'Developer Support',
        item_type: conv.item_type || 'system',
        lastMessage: last
          ? { sender_email: last.sender_email,
              text: decryptMessage(last.message_enc, last.iv, last.auth_tag),
              created_at: last.created_at }
          : null,
        unread: false, // extend with unread tracking if needed later
      };
    }).filter(conv => conv.lastMessage !== null);

    res.json({ conversations: result });
  } catch (err) {
    console.error('[LF] GET /conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/lostfound/conversations/:id/messages
router.get('/conversations/:id/messages', requireAuth, (req, res) => {
  try {
    purgeOldMessages();
    const db = getDb();

    const conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.item_owner_email !== req.user.email && conv.inquirer_email !== req.user.email)
      return res.status(403).json({ error: 'Not authorized' });

    const rawMessages = db.prepare(
      'SELECT * FROM lf_messages WHERE conversation_id = ? AND is_deleted = 0 ORDER BY created_at ASC'
    ).all(req.params.id);

    console.log('[LF] GET /conversations/:id/messages - conv:', conv.id, 'found', rawMessages.length, 'messages');
    console.log('[LF] Current user email:', req.user.email, 'conv item_owner:', conv.item_owner_email, 'conv inquirer:', conv.inquirer_email);

    const messages = rawMessages.map(m => {
      const reactions = db.prepare('SELECT emoji, sender_email FROM lf_message_reactions WHERE message_id = ?').all(m.id);
      try {
        const decrypted = m.message_enc ? decryptMessage(m.message_enc, m.iv, m.auth_tag) : '[Message unsent]';
        console.log('[LF] Message', m.id, 'sender:', m.sender_email, 'current user:', req.user.email, 'is_mine:', m.sender_email === req.user.email, 'decrypted:', decrypted);
        return {
          id: m.id,
          sender_email: m.sender_email,
          text: decrypted,
          created_at: m.created_at,
          is_mine: m.sender_email === req.user.email,
          is_deleted: !m.message_enc,
          file_path: m.file_path,
          file_name: m.file_name,
          reactions: reactions.length > 0 ? reactions : null,
        };
      } catch (decryptErr) {
        console.error('[LF] Failed to decrypt message', m.id, ':', decryptErr);
        return {
          id: m.id,
          sender_email: m.sender_email,
          text: '[Decryption failed]',
          created_at: m.created_at,
          is_mine: m.sender_email === req.user.email,
          is_deleted: !m.message_enc,
          file_path: m.file_path,
          file_name: m.file_name,
          reactions: reactions.length > 0 ? reactions : null,
        };
      }
    });

    const item = conv.item_id === 0 ? null : parseItem(db.prepare('SELECT * FROM lf_items WHERE id = ?').get(conv.item_id));
    res.json({ messages, conversation: { ...conv, item } });
  } catch (err) {
    console.error('[LF] GET /conversations/:id/messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/lostfound/conversations/:id/messages
router.post('/conversations/:id/messages', requireAuth, uploadMessage.single('file'), (req, res) => {
  try {
    const db = getDb();
    const { text } = req.body;
    const file = req.file;

    if (!text?.trim() && !file) return res.status(400).json({ error: 'Message text or file required' });

    const conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.item_owner_email !== req.user.email && conv.inquirer_email !== req.user.email)
      return res.status(403).json({ error: 'Not authorized' });

    let messageText = text?.trim() || '';
    let messageEnc, iv, authTag;
    if (messageText) {
      const encrypted = encryptMessage(messageText);
      messageEnc = encrypted.message_enc;
      iv = encrypted.iv;
      authTag = encrypted.auth_tag;
    }

    const r = db.prepare(`
      INSERT INTO lf_messages (conversation_id, sender_email, message_enc, iv, auth_tag, file_path, file_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(conv.id, req.user.email, messageEnc || null, iv || null, authTag || null, file ? `/uploads/${file.filename}` : null, file ? file.originalname : null);

    const saved = db.prepare('SELECT * FROM lf_messages WHERE id = ?').get(r.lastInsertRowid);

    // Notify the other participant
    const recipientEmail = conv.item_owner_email === req.user.email ? conv.inquirer_email : conv.item_owner_email;
    const senderName = req.user.email.split('@')[0];
    insertNotification(db, recipientEmail, 'new_message',
      `New message from ${senderName}`,
      messageText ? (messageText.length > 60 ? messageText.slice(0, 60) + '…' : messageText) : '📎 Sent a file',
      '/messages'
    );

    res.status(201).json({
      message: {
        id: saved.id,
        sender_email: saved.sender_email,
        text: messageText,
        file_path: saved.file_path,
        file_name: saved.file_name,
        created_at: saved.created_at,
        is_mine: true,
      },
    });
  } catch (err) {
    console.error('[LF] POST /conversations/:id/messages error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// DELETE /api/lostfound/messages/:id/unsend
router.delete('/messages/:id/unsend', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const msg = db.prepare('SELECT * FROM lf_messages WHERE id = ?').get(req.params.id);
    
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_email !== req.user.email) return res.status(403).json({ error: 'Not authorized' });

    // Soft delete: set message_enc to null to indicate deleted message
    db.prepare('UPDATE lf_messages SET message_enc = NULL, iv = NULL, auth_tag = NULL WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Message unsent' });
  } catch (err) {
    console.error('[LF] DELETE /messages/:id/unsend error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Failed to unsend message' });
  }
});

// POST /api/lostfound/messages/:id/reactions
router.post('/messages/:id/reactions', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji required' });

    const msg = db.prepare('SELECT * FROM lf_messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    // Check if user is part of the conversation
    const conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(msg.conversation_id);
    if (!conv || (conv.item_owner_email !== req.user.email && conv.inquirer_email !== req.user.email))
      return res.status(403).json({ error: 'Not authorized' });

    // Check if user already has this exact emoji reaction on this message
    const existingReaction = db.prepare(`
      SELECT * FROM lf_message_reactions 
      WHERE message_id = ? AND sender_email = ? AND emoji = ?
    `).get(req.params.id, req.user.email, emoji);

    if (existingReaction) {
      // Same emoji - toggle off (remove)
      db.prepare('DELETE FROM lf_message_reactions WHERE id = ?').run(existingReaction.id);
    } else {
      // New emoji - add it (allow multiple different emojis from same user)
      db.prepare(`
        INSERT INTO lf_message_reactions (message_id, sender_email, emoji)
        VALUES (?, ?, ?)
      `).run(req.params.id, req.user.email, emoji);
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[LF] POST /messages/:id/reactions error:', err);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// GET /api/lostfound/message-requests/incoming
router.get('/message-requests/incoming', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const requests = db.prepare(`
      SELECT * FROM admin_message_requests
      WHERE user_email = ?
      ORDER BY created_at DESC
    `).all(req.user.email);

    res.json({ requests });
  } catch (err) {
    console.error('[LF] GET /message-requests/incoming error:', err.message, err);
    res.status(500).json({ error: 'Failed to fetch requests: ' + err.message });
  }
});

// POST /api/lostfound/message-requests/:id/respond
router.post('/message-requests/:id/respond', requireAuth, (req, res) => {
  console.log('[LF] POST /message-requests/:id/respond - body:', req.body, 'params:', req.params);
  
  const db = getDb();
  const { accepted } = req.body;

  console.log('[LF] Extracted accepted:', accepted, 'typeof:', typeof accepted);

  try {
    const request = db.prepare(`
      SELECT * FROM admin_message_requests
      WHERE id = ? AND user_email = ?
    `).get(req.params.id, req.user.email);

    console.log('[LF] Request found:', request);

    if (!request) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    // Prevent admin from responding to their own request
    if (request.admin_email === req.user.email) {
      return res.status(403).json({ error: 'Cannot respond to your own request' });
    }

    // Mark as accepted or rejected
    const status = accepted ? 'accepted' : 'rejected';
    console.log('[LF] Updating status to:', status);
    db.prepare(`
      UPDATE admin_message_requests
      SET status = ?, responded_at = datetime('now')
      WHERE id = ?
    `).run(status, req.params.id);

    let convId = null;

    // If accepted, create a conversation and send auto-message
    if (accepted) {
      console.log('[LF] Creating conversation and auto-message...');
      try {
        const autoMessage = 'Hello! Thank you for accepting our message request. Our team is here to assist you with any inquiries. Feel free to ask questions or provide additional information. We look forward to helping resolve your concerns.';
        
        // Check if a conversation already exists between admin and user
        const existingConv = db.prepare(`
          SELECT id FROM lf_conversations 
          WHERE (item_owner_email = ? AND inquirer_email = ?) 
          OR (item_owner_email = ? AND inquirer_email = ?)
        `).get(request.admin_email, request.user_email, request.user_email, request.admin_email);

        if (existingConv) {
          convId = existingConv.id;
          console.log('[LF] Found existing conversation:', convId);
        } else {
          // Create a new conversation - admin is owner, user is inquirer
          const conv = db.prepare(`
            INSERT INTO lf_conversations (item_id, item_owner_email, inquirer_email)
            VALUES (0, ?, ?)
          `).run(request.admin_email, request.user_email);
          
          convId = conv.lastInsertRowid;
          console.log('[LF] INSERT result:', conv);
          console.log('[LF] Created new conversation with ID:', convId, 'type:', typeof convId, 'admin:', request.admin_email, 'user:', request.user_email);
          
          // Verify it was created
          const verify = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(convId);
          console.log('[LF] Verified conversation:', verify);
        }

        // Send the auto-message from admin to user
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
        let enc = cipher.update(autoMessage, 'utf8', 'hex');
        enc += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        console.log('[LF] Encrypting auto-message:', {
          message: autoMessage,
          iv: iv.toString('hex'),
          authTag: authTag,
          enc: enc.substring(0, 50) + '...',
          conversationId: convId,
          conversationIdType: typeof convId,
        });

        console.log('[LF] About to insert message into conversation:', convId);
        db.prepare(`
          INSERT INTO lf_messages (conversation_id, sender_email, message_enc, iv, auth_tag)
          VALUES (?, ?, ?, ?, ?)
        `).run(convId, request.admin_email, enc, iv.toString('hex'), authTag);
        
        console.log('[LF] Created auto-message in conversation:', convId);
      } catch (msgErr) {
        console.error('[LF] Error creating auto-message:', msgErr);
        // Don't fail the request if auto-message fails
      }
    }

    // Notify the admin of the user's response
    if (accepted) {
      insertNotification(db, request.admin_email, 'request_accepted',
        'Message request accepted',
        `${request.user_email.split('@')[0]} has accepted your message request.`,
        '/messages'
      );
    } else {
      insertNotification(db, request.admin_email, 'request_rejected',
        'Message request declined',
        `${request.user_email.split('@')[0]} declined your message request.`,
        '/messages'
      );
    }

    res.json({ success: true, message: `Request ${status}`, conversationId: convId });
  } catch (err) {
    console.error('[LF] POST /message-requests/:id/respond error:', err);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

// End/Archive a conversation - marks all messages as deleted/hidden
router.post('/conversations/:id/end', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const conversationId = req.params.id;
    
    // Get the conversation to verify user is part of it
    const conv = db.prepare(`
      SELECT * FROM lf_conversations WHERE id = ?
    `).get(conversationId);
    
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Only the admin (item_owner) can end a conversation
    if (conv.item_owner_email !== req.user.email) {
      return res.status(403).json({ error: 'Only the admin can end this conversation' });
    }
    
    // Mark all messages in this conversation as deleted (soft delete)
    const result = db.prepare(`
      UPDATE lf_messages
      SET is_deleted = 1
      WHERE conversation_id = ?
    `).run(conversationId);
    
    console.log(`[LF] Conversation ${conversationId} ended - ${result.changes} messages archived`);
    
    res.json({ success: true, message: 'Conversation ended', messagesDeleted: result.changes });
  } catch (err) {
    console.error('[LF] POST /conversations/:id/end error:', err);
    res.status(500).json({ error: 'Failed to end conversation' });
  }
});

// ── READ RECEIPTS ──────────────────────────────────────────────────────────────

// PUT /api/lostfound/conversations/:id/read
router.put('/conversations/:id/read', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { lastReadMessageId } = req.body;
    
    const conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.item_owner_email !== req.user.email && conv.inquirer_email !== req.user.email)
      return res.status(403).json({ error: 'Not authorized' });
    
    db.prepare(`
      INSERT INTO lf_read_receipts (conversation_id, user_email, last_read_message_id, last_read_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(conversation_id, user_email) 
      DO UPDATE SET last_read_message_id = ?, last_read_at = datetime('now')
    `).run(req.params.id, req.user.email, lastReadMessageId, lastReadMessageId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] PUT /conversations/:id/read error:', err);
    res.status(500).json({ error: 'Failed to update read receipt' });
  }
});

// GET /api/lostfound/conversations/:id/read-status
router.get('/conversations/:id/read-status', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const receipts = db.prepare(`
      SELECT user_email, last_read_message_id, last_read_at FROM lf_read_receipts
      WHERE conversation_id = ?
    `).all(req.params.id);
    
    res.json({ receipts });
  } catch (err) {
    console.error('[LF] GET /conversations/:id/read-status error:', err);
    res.status(500).json({ error: 'Failed to fetch read status' });
  }
});

// ── MESSAGE EDITING ────────────────────────────────────────────────────────────

// PUT /api/lostfound/messages/:id/edit
router.put('/messages/:id/edit', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { text } = req.body;
    
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
    
    const msg = db.prepare('SELECT * FROM lf_messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_email !== req.user.email) return res.status(403).json({ error: 'Not authorized' });
    
    const encrypted = encryptMessage(text.trim());
    db.prepare(`
      UPDATE lf_messages 
      SET message_enc = ?, iv = ?, auth_tag = ?, is_edited = 1, edited_at = datetime('now')
      WHERE id = ?
    `).run(encrypted.message_enc, encrypted.iv, encrypted.auth_tag, req.params.id);
    
    res.json({ success: true, edited_at: new Date().toISOString() });
  } catch (err) {
    console.error('[LF] PUT /messages/:id/edit error:', err);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// ── TYPING INDICATORS ──────────────────────────────────────────────────────────

// POST /api/lostfound/conversations/:id/typing
router.post('/conversations/:id/typing', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(req.params.id);
    
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.item_owner_email !== req.user.email && conv.inquirer_email !== req.user.email)
      return res.status(403).json({ error: 'Not authorized' });
    
    db.prepare(`
      INSERT INTO lf_typing_indicators (conversation_id, user_email, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(conversation_id, user_email) DO UPDATE SET updated_at = datetime('now')
    `).run(req.params.id, req.user.email);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] POST /conversations/:id/typing error:', err);
    res.status(500).json({ error: 'Failed to update typing status' });
  }
});

// GET /api/lostfound/conversations/:id/typing
router.get('/conversations/:id/typing', requireAuth, (req, res) => {
  try {
    const db = getDb();
    // Get typing users (within last 5 seconds)
    const typingUsers = db.prepare(`
      SELECT user_email FROM lf_typing_indicators
      WHERE conversation_id = ? 
      AND datetime(updated_at) > datetime('now', '-5 seconds')
      AND user_email != ?
    `).all(req.params.id, req.user.email);
    
    res.json({ typing: typingUsers.map(u => u.user_email) });
  } catch (err) {
    console.error('[LF] GET /conversations/:id/typing error:', err);
    res.status(500).json({ error: 'Failed to fetch typing status' });
  }
});

// ── MESSAGE SEARCH ────────────────────────────────────────────────────────────

// GET /api/lostfound/conversations/:id/search
router.get('/conversations/:id/search', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { q } = req.query;
    
    if (!q || q.length < 2) return res.json({ results: [] });
    
    const conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.item_owner_email !== req.user.email && conv.inquirer_email !== req.user.email)
      return res.status(403).json({ error: 'Not authorized' });
    
    // Note: Can't search encrypted messages directly - would need to decrypt all
    // This is a limitation of encryption. Could store unencrypted search index alternatively
    res.json({ results: [] });
  } catch (err) {
    console.error('[LF] GET /conversations/:id/search error:', err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// ── PINNED MESSAGES ────────────────────────────────────────────────────────────

// POST /api/lostfound/messages/:id/pin
router.post('/messages/:id/pin', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const msg = db.prepare('SELECT * FROM lf_messages WHERE id = ?').get(req.params.id);
    
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    
    const conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(msg.conversation_id);
    if (conv.item_owner_email !== req.user.email && conv.inquirer_email !== req.user.email)
      return res.status(403).json({ error: 'Not authorized' });
    
    db.prepare(`
      INSERT INTO lf_pinned_messages (conversation_id, message_id, pinned_by, pinned_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(conversation_id, message_id) DO NOTHING
    `).run(msg.conversation_id, req.params.id, req.user.email);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] POST /messages/:id/pin error:', err);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// DELETE /api/lostfound/messages/:id/pin
router.delete('/messages/:id/pin', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const pin = db.prepare(`
      SELECT * FROM lf_pinned_messages WHERE message_id = ?
    `).get(req.params.id);
    
    if (!pin) return res.status(404).json({ error: 'Pin not found' });
    
    db.prepare('DELETE FROM lf_pinned_messages WHERE message_id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] DELETE /messages/:id/pin error:', err);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

// GET /api/lostfound/conversations/:id/pinned
router.get('/conversations/:id/pinned', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const pinned = db.prepare(`
      SELECT m.*, p.pinned_at, p.pinned_by FROM lf_pinned_messages p
      JOIN lf_messages m ON p.message_id = m.id
      WHERE p.conversation_id = ?
      ORDER BY p.pinned_at DESC
    `).all(req.params.id);
    
    res.json({ pinned });
  } catch (err) {
    console.error('[LF] GET /conversations/:id/pinned error:', err);
    res.status(500).json({ error: 'Failed to fetch pinned messages' });
  }
});

// ── MESSAGE THREADING/REPLIES ──────────────────────────────────────────────────

// The reply_to_id is already added to lf_messages table
// Clients can filter and display messages as replies

// ── CONVERSATION ARCHIVING ────────────────────────────────────────────────────

// PUT /api/lostfound/conversations/:id/archive
router.put('/conversations/:id/archive', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { isArchived } = req.body;
    
    const conv = db.prepare('SELECT * FROM lf_conversations WHERE id = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.item_owner_email !== req.user.email && conv.inquirer_email !== req.user.email)
      return res.status(403).json({ error: 'Not authorized' });
    
    db.prepare('UPDATE lf_conversations SET is_archived = ? WHERE id = ?').run(
      isArchived ? 1 : 0,
      req.params.id
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] PUT /conversations/:id/archive error:', err);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
});

// ── USER BLOCKING ──────────────────────────────────────────────────────────────

// POST /api/lostfound/users/block
router.post('/users/block', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { blockedEmail, reason } = req.body;
    
    if (!blockedEmail) return res.status(400).json({ error: 'Blocked email required' });
    if (blockedEmail === req.user.email) return res.status(400).json({ error: 'Cannot block yourself' });
    
    db.prepare(`
      INSERT INTO lf_user_blocks (blocker_email, blocked_email, reason)
      VALUES (?, ?, ?)
      ON CONFLICT(blocker_email, blocked_email) DO UPDATE SET reason = ?
    `).run(req.user.email, blockedEmail, reason || null, reason || null);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] POST /users/block error:', err);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// DELETE /api/lostfound/users/unblock/:email
router.delete('/users/unblock/:email', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM lf_user_blocks WHERE blocker_email = ? AND blocked_email = ?')
      .run(req.user.email, req.params.email);
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] DELETE /users/unblock error:', err);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// GET /api/lostfound/users/blocked
router.get('/users/blocked', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const blocked = db.prepare(`
      SELECT blocked_email, reason, created_at FROM lf_user_blocks
      WHERE blocker_email = ?
      ORDER BY created_at DESC
    `).all(req.user.email);
    
    res.json({ blocked });
  } catch (err) {
    console.error('[LF] GET /users/blocked error:', err);
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

// ── CONVERSATION MUTING ────────────────────────────────────────────────────────

// POST /api/lostfound/conversations/:id/mute
router.post('/conversations/:id/mute', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO lf_conversation_mutes (conversation_id, user_email, muted_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(conversation_id, user_email) DO NOTHING
    `).run(req.params.id, req.user.email);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] POST /conversations/:id/mute error:', err);
    res.status(500).json({ error: 'Failed to mute conversation' });
  }
});

// DELETE /api/lostfound/conversations/:id/mute
router.delete('/conversations/:id/mute', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM lf_conversation_mutes WHERE conversation_id = ? AND user_email = ?')
      .run(req.params.id, req.user.email);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[LF] DELETE /conversations/:id/mute error:', err);
    res.status(500).json({ error: 'Failed to unmute conversation' });
  }
});

// GET /api/lostfound/conversations/:id/is-muted
router.get('/conversations/:id/is-muted', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const mute = db.prepare(`
      SELECT * FROM lf_conversation_mutes
      WHERE conversation_id = ? AND user_email = ?
    `).get(req.params.id, req.user.email);
    
    res.json({ isMuted: !!mute });
  } catch (err) {
    console.error('[LF] GET /conversations/:id/is-muted error:', err);
    res.status(500).json({ error: 'Failed to check mute status' });
  }
});

export default router;
