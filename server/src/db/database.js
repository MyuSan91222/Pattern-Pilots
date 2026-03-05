import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = process.env.DB_DIR || join(process.env.HOME || '/tmp', '.attendance-analyzer');
const DB_PATH = process.env.DB_PATH || join(DB_DIR, 'app.db');

if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

export function ensureAdminUser(email, password) {
  const db = getDb();
  const existing = db.prepare('SELECT email, role FROM users WHERE email = ?').get(email);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(
      `INSERT INTO users (email, password_hash, verified, role) VALUES (?, ?, 1, 'admin')`
    ).run(email, hash);
    console.log(`[DB] Admin user created: ${email}`);
  } else if (existing.role !== 'admin') {
    db.prepare("UPDATE users SET role = 'admin', verified = 1 WHERE email = ?").run(email);
    console.log(`[DB] User promoted to admin: ${email}`);
  }
}

export function recordLogin(userId, email) {
  const db = getDb();
  const loginTime = new Date().toISOString();
  
  // Update last login
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(loginTime, userId);
  
  // Create new attendance session
  db.prepare(`
    INSERT INTO attendance_sessions (user_id, user_email, login_time)
    VALUES (?, ?, ?)
  `).run(userId, email, loginTime);
  
  // Log activity
  db.prepare(`
    INSERT INTO activity_log (user_id, user_email, action, login_time, created_at)
    VALUES (?, ?, 'login', ?, ?)
  `).run(userId, email, loginTime, loginTime);
}

export function recordLogout(userId, email) {
  const db = getDb();
  const logoutTime = new Date().toISOString();
  
  // Update last logout
  db.prepare('UPDATE users SET last_logout = ? WHERE id = ?').run(logoutTime, userId);
  
  // Find active session and close it
  const session = db.prepare(`
    SELECT id FROM attendance_sessions 
    WHERE user_id = ? AND logout_time IS NULL
    ORDER BY login_time DESC LIMIT 1
  `).get(userId);
  
  if (session) {
    const loginSession = db.prepare('SELECT login_time FROM attendance_sessions WHERE id = ?').get(session.id);
    const loginTime = new Date(loginSession.login_time);
    const logout = new Date(logoutTime);
    const durationMinutes = Math.round((logout - loginTime) / 60000);
    
    db.prepare(`
      UPDATE attendance_sessions 
      SET logout_time = ?, duration_minutes = ?
      WHERE id = ?
    `).run(logoutTime, durationMinutes, session.id);
  }
  
  // Log activity
  db.prepare(`
    INSERT INTO activity_log (user_id, user_email, action, logout_time, created_at)
    VALUES (?, ?, 'logout', ?, ?)
  `).run(userId, email, logoutTime, logoutTime);
  
  // Increment activity count
  db.prepare('UPDATE users SET activity_count = activity_count + 1 WHERE id = ?').run(userId);
}

export function getUserActivityStats(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT 
      id,
      email,
      activity_count,
      last_login,
      last_logout,
      created_at,
      (SELECT COUNT(*) FROM attendance_sessions WHERE user_id = ?) as total_sessions
    FROM users WHERE id = ?
  `).get(userId, userId);
}

export function getAttendanceHistory(userId, limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT 
      id,
      login_time,
      logout_time,
      duration_minutes,
      created_at
    FROM attendance_sessions
    WHERE user_id = ?
    ORDER BY login_time DESC
    LIMIT ?
  `).all(userId, limit);
}

// Safely add a column if it doesn't already exist (SQLite has no IF NOT EXISTS for ALTER)
function addColumnIfMissing(table, column, definition) {
  try {
    db.prepare(`SELECT "${column}" FROM "${table}" LIMIT 1`).get();
  } catch {
    try {
      db.prepare(`ALTER TABLE "${table}" ADD COLUMN ${column} ${definition}`).run();
    } catch {}
  }
}

function initSchema() {
  // Create users table first
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      verification_token TEXT,
      verification_token_expires TEXT,
      remember_token TEXT,
      reset_token TEXT,
      reset_token_expires TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT,
      last_logout TEXT,
      activity_count INTEGER DEFAULT 0,
      first_name TEXT,
      last_name TEXT,
      nickname TEXT,
      bio TEXT,
      profile_pic TEXT,
      profile_pic_url TEXT,
      phone TEXT,
      location TEXT,
      website TEXT,
      social_links TEXT,
      preferences TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Ensure all users columns exist for older databases
  addColumnIfMissing('users', 'last_logout', 'TEXT');
  addColumnIfMissing('users', 'activity_count', 'INTEGER DEFAULT 0');
  addColumnIfMissing('users', 'first_name', 'TEXT');
  addColumnIfMissing('users', 'last_name', 'TEXT');
  addColumnIfMissing('users', 'nickname', 'TEXT');
  addColumnIfMissing('users', 'bio', 'TEXT');
  addColumnIfMissing('users', 'profile_pic', 'TEXT');
  addColumnIfMissing('users', 'profile_pic_url', 'TEXT');
  addColumnIfMissing('users', 'phone', 'TEXT');
  addColumnIfMissing('users', 'location', 'TEXT');
  addColumnIfMissing('users', 'website', 'TEXT');
  addColumnIfMissing('users', 'social_links', 'TEXT');
  addColumnIfMissing('users', 'preferences', 'TEXT');
  addColumnIfMissing('users', 'updated_at', 'TEXT DEFAULT (datetime("now"))');

  // Check if activity_log needs migration
  try {
    const columns = db.prepare("PRAGMA table_info(activity_log)").all();
    const hasUserId = columns.some(col => col.name === 'user_id');
    
    if (hasUserId) {
      // New schema - already migrated
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          user_email TEXT NOT NULL,
          action TEXT NOT NULL,
          detail TEXT,
          login_time TEXT,
          logout_time TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    } else {
      // Old schema - create with backward compatibility
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          user_email TEXT NOT NULL,
          action TEXT NOT NULL,
          detail TEXT,
          login_time TEXT,
          logout_time TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    }
  } catch {
    // Table doesn't exist, create new
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT,
        login_time TEXT,
        logout_time TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  // Ensure all activity_log columns exist for older databases
  addColumnIfMissing('activity_log', 'user_id', 'INTEGER');
  addColumnIfMissing('activity_log', 'login_time', 'TEXT');
  addColumnIfMissing('activity_log', 'logout_time', 'TEXT');

  // Create remaining tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      login_time TEXT NOT NULL,
      logout_time TEXT,
      duration_minutes INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_session_user ON attendance_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_session_date ON attendance_sessions(created_at);
  `);

  // Lost & Found tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS lf_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'other',
      location TEXT DEFAULT '',
      item_date TEXT,
      contact_name TEXT,
      contact_email TEXT,
      tags TEXT DEFAULT '[]',
      reward INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      image_filename TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS lf_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      item_owner_email TEXT NOT NULL,
      inquirer_email TEXT NOT NULL,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(item_id) REFERENCES lf_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lf_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_email TEXT NOT NULL,
      message_enc TEXT,
      iv TEXT,
      auth_tag TEXT,
      file_path TEXT,
      file_name TEXT,
      is_deleted INTEGER DEFAULT 0,
      is_edited INTEGER DEFAULT 0,
      edited_at TEXT,
      reply_to_id INTEGER,
      original_message_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(conversation_id) REFERENCES lf_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(reply_to_id) REFERENCES lf_messages(id) ON DELETE SET NULL,
      FOREIGN KEY(original_message_id) REFERENCES lf_messages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS lf_message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      sender_email TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(message_id, sender_email, emoji),
      FOREIGN KEY(message_id) REFERENCES lf_messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_message_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_email TEXT NOT NULL,
      user_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      responded_at TEXT,
      UNIQUE(admin_email, user_email)
    );

    /* ── Lost & Found Enhanced Features ── */
    CREATE TABLE IF NOT EXISTS lf_read_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      last_read_message_id INTEGER,
      last_read_at TEXT DEFAULT (datetime('now')),
      UNIQUE(conversation_id, user_email),
      FOREIGN KEY(conversation_id) REFERENCES lf_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(last_read_message_id) REFERENCES lf_messages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS lf_message_delivery_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'sent',
      delivered_at TEXT,
      read_by_email TEXT,
      read_at TEXT,
      FOREIGN KEY(message_id) REFERENCES lf_messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lf_typing_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(conversation_id, user_email),
      FOREIGN KEY(conversation_id) REFERENCES lf_conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lf_pinned_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      message_id INTEGER NOT NULL,
      pinned_by TEXT NOT NULL,
      pinned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(conversation_id, message_id),
      FOREIGN KEY(conversation_id) REFERENCES lf_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(message_id) REFERENCES lf_messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lf_user_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_email TEXT NOT NULL,
      blocked_email TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(blocker_email, blocked_email)
    );

    CREATE TABLE IF NOT EXISTS lf_conversation_mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      muted_at TEXT DEFAULT (datetime('now')),
      UNIQUE(conversation_id, user_email),
      FOREIGN KEY(conversation_id) REFERENCES lf_conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lf_message_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      language_code TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      translated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(message_id, language_code),
      FOREIGN KEY(message_id) REFERENCES lf_messages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_lf_items_status  ON lf_items(status);
    CREATE INDEX IF NOT EXISTS idx_lf_items_email   ON lf_items(user_email);
    CREATE INDEX IF NOT EXISTS idx_lf_conv_item     ON lf_conversations(item_id);
    CREATE INDEX IF NOT EXISTS idx_lf_conv_inquirer ON lf_conversations(inquirer_email);
    CREATE INDEX IF NOT EXISTS idx_lf_conv_archived ON lf_conversations(is_archived);
    CREATE INDEX IF NOT EXISTS idx_lf_conv_owner    ON lf_conversations(item_owner_email);
    CREATE INDEX IF NOT EXISTS idx_lf_msg_conv      ON lf_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_lf_msg_date      ON lf_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_lf_reactions_msg ON lf_message_reactions(message_id);
  `);

  // Migrate lf_messages table if needed (make columns nullable for soft-delete and add file support)
  try {
    const columns = db.prepare("PRAGMA table_info(lf_messages)").all();
    const messageEncCol = columns.find(col => col.name === 'message_enc');
    const hasFileColumns = columns.some(col => col.name === 'file_path');
    const hasIsDeleted = columns.some(col => col.name === 'is_deleted');
    const hasEditColumns = columns.some(col => col.name === 'is_edited');
    
    if ((messageEncCol && messageEncCol.notnull) || !hasFileColumns || !hasIsDeleted || !hasEditColumns) {
      console.log('[DB] Migrating lf_messages table...');
      db.exec(`
        BEGIN TRANSACTION;
        CREATE TABLE lf_messages_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          sender_email TEXT NOT NULL,
          message_enc TEXT,
          iv TEXT,
          auth_tag TEXT,
          file_path TEXT,
          file_name TEXT,
          is_deleted INTEGER DEFAULT 0,
          is_edited INTEGER DEFAULT 0,
          edited_at TEXT,
          reply_to_id INTEGER,
          original_message_id INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY(conversation_id) REFERENCES lf_conversations(id) ON DELETE CASCADE,
          FOREIGN KEY(reply_to_id) REFERENCES lf_messages(id) ON DELETE SET NULL,
          FOREIGN KEY(original_message_id) REFERENCES lf_messages(id) ON DELETE SET NULL
        );
        INSERT INTO lf_messages_new SELECT id, conversation_id, sender_email, message_enc, iv, auth_tag, file_path, file_name, COALESCE(is_deleted, 0), 0, NULL, NULL, NULL, created_at FROM lf_messages;
        DROP TABLE lf_messages;
        ALTER TABLE lf_messages_new RENAME TO lf_messages;
        COMMIT;
      `);
      console.log('[DB] lf_messages table migrated successfully');
    }
  } catch (err) {
    // Migration not needed or table doesn't exist
  }

  // Add missing columns to existing tables
  addColumnIfMissing('lf_messages', 'file_path', 'TEXT');
  addColumnIfMissing('lf_messages', 'file_name', 'TEXT');
  addColumnIfMissing('lf_messages', 'is_deleted', 'INTEGER DEFAULT 0');
  addColumnIfMissing('lf_messages', 'is_edited', 'INTEGER DEFAULT 0');
  addColumnIfMissing('lf_messages', 'edited_at', 'TEXT');
  addColumnIfMissing('lf_messages', 'reply_to_id', 'INTEGER');
  addColumnIfMissing('lf_messages', 'original_message_id', 'INTEGER');
  addColumnIfMissing('lf_conversations', 'is_archived', 'INTEGER DEFAULT 0');

  // ── Group Chat tables ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS gc_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_by TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#1e3a6e',
      invite_token TEXT UNIQUE,
      is_public INTEGER DEFAULT 1,
      is_suspended INTEGER DEFAULT 0,
      suspension_reason TEXT,
      suspended_by TEXT,
      suspended_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gc_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      muted INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, user_email),
      FOREIGN KEY(group_id) REFERENCES gc_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gc_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      sender_email TEXT NOT NULL,
      message_text TEXT,
      reply_to_id INTEGER,
      file_path TEXT,
      file_name TEXT,
      file_type TEXT,
      is_edited INTEGER DEFAULT 0,
      edited_at TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(group_id) REFERENCES gc_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gc_message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(message_id, user_email, emoji),
      FOREIGN KEY(message_id) REFERENCES gc_messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gc_pinned_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      message_id INTEGER NOT NULL,
      pinned_by TEXT NOT NULL,
      pinned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, message_id),
      FOREIGN KEY(group_id) REFERENCES gc_groups(id) ON DELETE CASCADE,
      FOREIGN KEY(message_id) REFERENCES gc_messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gc_read_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      last_read_message_id INTEGER,
      last_read_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, user_email),
      FOREIGN KEY(group_id) REFERENCES gc_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gc_typing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, user_email),
      FOREIGN KEY(group_id) REFERENCES gc_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gc_join_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      requester_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, requester_email),
      FOREIGN KEY(group_id) REFERENCES gc_groups(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_gc_members_group  ON gc_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_gc_members_user   ON gc_members(user_email);
    CREATE INDEX IF NOT EXISTS idx_gc_messages_group ON gc_messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_gc_messages_date  ON gc_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_gc_reactions_msg  ON gc_message_reactions(message_id);
    CREATE INDEX IF NOT EXISTS idx_gc_pins_group     ON gc_pinned_messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_gc_receipts       ON gc_read_receipts(group_id);
    CREATE INDEX IF NOT EXISTS idx_gc_typing         ON gc_typing(group_id);
    CREATE INDEX IF NOT EXISTS idx_gc_join_requests  ON gc_join_requests(group_id);

    CREATE TABLE IF NOT EXISTS gc_suspension_appeals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      founder_email TEXT NOT NULL,
      appeal_text TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(group_id) REFERENCES gc_groups(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_gc_appeals_group ON gc_suspension_appeals(group_id);
    CREATE INDEX IF NOT EXISTS idx_gc_appeals_status ON gc_suspension_appeals(status);

    CREATE TABLE IF NOT EXISTS gc_call_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      caller_email TEXT NOT NULL,
      started_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id),
      FOREIGN KEY(group_id) REFERENCES gc_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_email, is_read);

    CREATE TABLE IF NOT EXISTS lf_saved_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      saved_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_email, item_id),
      FOREIGN KEY(item_id) REFERENCES lf_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_lf_saved_items_user ON lf_saved_items(user_email);
  `);

  // Migrate gc_groups table to add suspension columns if needed
  addColumnIfMissing('gc_groups', 'is_suspended', 'INTEGER DEFAULT 0');
  addColumnIfMissing('gc_groups', 'suspension_reason', 'TEXT');
  addColumnIfMissing('gc_groups', 'suspended_by', 'TEXT');
  addColumnIfMissing('gc_groups', 'suspended_at', 'TEXT');

  // Migrate existing gc_groups if is_public column is missing
  addColumnIfMissing('gc_groups', 'is_public', 'INTEGER DEFAULT 1');

  // Add sender_type to admin_message_requests if missing (distinguish between admin and user initiated)
  addColumnIfMissing('admin_message_requests', 'sender_type', "TEXT DEFAULT 'user'");

  // Online status tracking
  addColumnIfMissing('users', 'last_seen', 'TEXT');
}

export function insertNotification(db, userEmail, type, title, body, link = null) {
  try {
    db.prepare(
      `INSERT INTO notifications (user_email, type, title, body, link) VALUES (?, ?, ?, ?, ?)`
    ).run(userEmail, type, title, body, link);
  } catch {
    // Never let notification errors break the main operation
  }
}
