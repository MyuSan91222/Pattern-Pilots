import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getDb, recordLogin, recordLogout, getUserActivityStats } from '../db/database.js';
import {
  generateAccessToken, generateRefreshToken, verifyRefreshToken,
  generateToken, sendVerificationEmail, sendResetEmail, verifyAccessToken
} from '../utils/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const REQUIRE_EMAIL_VERIFICATION = ['true','1','yes'].includes(
  (process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase()
);

function logActivity(email, action, detail = null) {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (user) {
    db.prepare(
      'INSERT INTO activity_log (user_id, user_email, action, detail) VALUES (?, ?, ?, ?)'
    ).run(user.id, email, action, detail);
  }
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const db = getDb();
  const existing = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = await bcrypt.hash(password, 12);
  const verified = REQUIRE_EMAIL_VERIFICATION ? 0 : 1;
  const verification_token = REQUIRE_EMAIL_VERIFICATION ? generateToken() : null;
  const expires = REQUIRE_EMAIL_VERIFICATION
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

  // Check if should be admin
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  const role = adminEmails.includes(email) ? 'admin' : 'user';

  db.prepare(`
    INSERT INTO users (email, password_hash, verified, verification_token, verification_token_expires, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(email, password_hash, verified, verification_token, expires, role);

  logActivity(email, 'signup');

  if (REQUIRE_EMAIL_VERIFICATION && verification_token) {
    const sent = await sendVerificationEmail(email, verification_token);
    return res.json({
      message: sent ? 'Verification email sent' : 'Account created',
      token: sent ? undefined : verification_token,
      requiresVerification: true
    });
  }

  res.json({ 
    message: 'Account created successfully',
    requiresVerification: false
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  if (REQUIRE_EMAIL_VERIFICATION && !user.verified) {
    return res.status(403).json({ error: 'Please verify your email before logging in' });
  }

  // Record login with attendance tracking (non-fatal)
  try { recordLogin(user.id, email); } catch (e) { console.error('[Login tracking]', e.message); }

  const accessToken = generateAccessToken(email, user.role);
  const refreshToken = generateRefreshToken(email);

  // Store refresh token
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_email, token, expires_at) VALUES (?, ?, ?)').run(email, refreshToken, expires);

  // Remember me cookie
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',  // 'none' required for cross-origin (Vercel→Render)
  };
  if (rememberMe) {
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
  } else {
    res.cookie('refreshToken', refreshToken, cookieOptions);
  }

  res.json({
    accessToken,
    user: { email: user.email, role: user.role, verified: !!user.verified, createdAt: user.created_at, lastLogin: user.last_login }
  });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = verifyRefreshToken(token);
    const db = getDb();
    const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(token);
    if (!stored || new Date(stored.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(payload.email);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = generateAccessToken(user.email, user.role);
    res.json({
      accessToken,
      user: { email: user.email, role: user.role, verified: !!user.verified, createdAt: user.created_at, lastLogin: user.last_login }
    });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    getDb().prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
    const email = (() => { try { return verifyRefreshToken(token)?.email; } catch { return null; } })();
    if (email) {
      try {
        const db = getDb();
        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (user) recordLogout(user.id, email);
      } catch (e) { console.error('[Logout tracking]', e.message); }
    }
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    const user = getDb().prepare('SELECT email, role, verified, created_at, last_login FROM users WHERE email = ?').get(payload.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ email: user.email, role: user.role, verified: !!user.verified, createdAt: user.created_at, lastLogin: user.last_login });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid token' });
  if (new Date(user.verification_token_expires) < new Date()) {
    return res.status(400).json({ error: 'Token expired' });
  }

  db.prepare('UPDATE users SET verified = 1, verification_token = NULL WHERE email = ?').run(user.email);
  logActivity(user.email, 'email_verified');
  res.json({ message: 'Email verified successfully' });
});

// POST /api/auth/forgot
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  // Always respond OK to prevent email enumeration
  if (!user) return res.json({ message: 'If that email exists, a reset link was sent' });

  const token = generateToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?').run(token, expires, email);

  const sent = await sendResetEmail(email, token);
  res.json({ message: 'If that email exists, a reset link was sent', token: sent ? undefined : token });
});

// POST /api/auth/reset
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?').run(hash, user.email);
  logActivity(user.email, 'password_reset');
  res.json({ message: 'Password reset successfully' });
});

// ── User Message Requests (User to Admin) ──────────────────────────────────────
// POST /api/auth/contact-admin - User sends message request to admin
router.post('/contact-admin', requireAuth, (req, res) => {
  const db = getDb();
  const { admin_email, message } = req.body;
  const user_email = req.user.email;

  if (!admin_email) {
    return res.status(400).json({ error: 'Admin email required' });
  }

  try {
    // Check if admin exists
    const admin = db.prepare('SELECT id, email FROM users WHERE email = ? AND role = ?').get(admin_email, 'admin');
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Insert message request from user to admin with sender_type = 'user'
    db.prepare(`
      INSERT INTO admin_message_requests (admin_email, user_email, status, message, sender_type)
      VALUES (?, ?, 'pending', ?, 'user')
      ON CONFLICT(admin_email, user_email) DO UPDATE SET
        status = 'pending',
        message = ?,
        sender_type = 'user',
        created_at = datetime('now'),
        responded_at = NULL
    `).run(admin_email, user_email, message || null, message || null);

    logActivity(user_email, 'contacted_admin', `Sent message to ${admin_email}`);
    res.status(201).json({ success: true, message: 'Message request sent to admin' });
  } catch (error) {
    console.error('[Auth] Error sending contact request:', error);
    res.status(500).json({ error: 'Failed to send message request' });
  }
});

// GET /api/auth/admins - Get list of all admins (public endpoint)
router.get('/admins', (req, res) => {
  const db = getDb();
  try {
    const admins = db.prepare(`
      SELECT email, created_at FROM users WHERE role = 'admin' ORDER BY created_at ASC
    `).all();
    
    // Log for debugging
    console.log('[Auth] Fetching admins, found:', admins.length);
    
    // Always return a successful response, even if empty
    res.json({ 
      admins: admins || [],
      success: true
    });
  } catch (error) {
    console.error('[Auth] Error fetching admins:', error);
    // Return empty array instead of error
    res.json({ 
      admins: [],
      success: false,
      error: 'Failed to fetch admin list'
    });
  }
});

// GET /api/auth/message-requests - User views both their outgoing requests to admins AND incoming requests from admins
router.get('/message-requests', requireAuth, (req, res) => {
  const db = getDb();
  const user_email = req.user.email;

  try {
    // Outgoing: user's requests to admins (sender_type = 'user')
    const outgoing = db.prepare(`
      SELECT id, admin_email as other_email, user_email, status, message, created_at, responded_at, 'outgoing' as type
      FROM admin_message_requests
      WHERE user_email = ? AND sender_type = 'user'
      ORDER BY created_at DESC
    `).all(user_email);

    // Incoming: admin requests to this user (sender_type = 'admin')
    const incoming = db.prepare(`
      SELECT id, admin_email as other_email, user_email, status, message, created_at, responded_at, 'incoming' as type
      FROM admin_message_requests
      WHERE user_email = ? AND sender_type = 'admin'
      ORDER BY created_at DESC
    `).all(user_email);

    // Combine both types
    const requests = [...outgoing, ...incoming];
    
    res.json({ requests });
  } catch (error) {
    console.error('[Auth] Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// DELETE /api/auth/message-requests/:id - User cancels their message request
router.delete('/message-requests/:id', requireAuth, (req, res) => {
  const db = getDb();
  const user_email = req.user.email;

  try {
    const request = db.prepare(`
      SELECT * FROM admin_message_requests WHERE id = ? AND user_email = ?
    `).get(req.params.id, user_email);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending requests' });
    }

    db.prepare('DELETE FROM admin_message_requests WHERE id = ?').run(req.params.id);
    logActivity(user_email, 'cancelled_request', `Cancelled request to ${request.admin_email}`);
    res.json({ message: 'Request cancelled' });
  } catch (error) {
    console.error('[Auth] Error cancelling request:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// PUT /api/auth/user-requests/:id/accept - Admin accepts user's message request
router.put('/user-requests/:id/accept', requireAuth, (req, res) => {
  const db = getDb();
  const admin_email = req.user.email;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can accept requests' });
    }

    const request = db.prepare(`
      SELECT * FROM admin_message_requests WHERE id = ? AND admin_email = ?
    `).get(req.params.id, admin_email);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
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

    logActivity(admin_email, 'accepted_request', `Accepted request from ${request.user_email}`);
    res.json({ success: true, message: 'Request accepted', user_email: request.user_email });
  } catch (error) {
    console.error('[Auth] Error accepting request:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// PUT /api/auth/user-requests/:id/reject - Admin rejects user's message request
router.put('/user-requests/:id/reject', requireAuth, (req, res) => {
  const db = getDb();
  const admin_email = req.user.email;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reject requests' });
    }

    const request = db.prepare(`
      SELECT * FROM admin_message_requests WHERE id = ? AND admin_email = ?
    `).get(req.params.id, admin_email);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only reject pending requests' });
    }

    // Update request status to rejected
    db.prepare(`
      UPDATE admin_message_requests
      SET status = 'rejected', responded_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);

    logActivity(admin_email, 'rejected_request', `Rejected request from ${request.user_email}`);
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('[Auth] Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { email } = req.user;
    const {
      first_name, last_name, nickname, bio, phone, location, website, 
      social_links, preferences, profile_pic_url
    } = req.body;

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build update query dynamically with only provided fields
    const updates = [];
    const values = [];
    const allowedFields = [
      'first_name', 'last_name', 'nickname', 'bio', 'phone', 'location', 
      'website', 'social_links', 'preferences', 'profile_pic_url'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = datetime("now")');
    values.push(email);

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE email = ?`;
    db.prepare(updateQuery).run(...values);

    // Return updated user profile
    const updatedUser = db.prepare(`
      SELECT id, email, first_name, last_name, nickname, bio, phone, location, 
             website, social_links, preferences, profile_pic_url, role, verified, 
             created_at, last_login
      FROM users WHERE email = ?
    `).get(email);

    logActivity(email, 'profile_updated', 'User updated profile information');
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[Auth] Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/auth/profile - Get user profile
router.get('/profile', requireAuth, (req, res) => {
  try {
    const { email } = req.user;
    const db = getDb();
    const user = db.prepare(`
      SELECT id, email, first_name, last_name, nickname, bio, phone, location, 
             website, social_links, preferences, profile_pic_url, role, verified, 
             created_at, last_login, activity_count
      FROM users WHERE email = ?
    `).get(email);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    console.error('[Auth] Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
