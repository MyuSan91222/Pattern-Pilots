import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import lostFoundRoutes from './routes/lostfound.js';
import groupChatRoutes from './routes/groupchat.js';
import notificationsRoutes from './routes/notifications.js';
import { getDb, ensureAdminUser } from './db/database.js';
import { verifyAccessToken } from './utils/auth.js';

const UPLOADS_DIR = join(process.env.HOME || '/tmp', '.attendance-analyzer', 'uploads');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize DB on startup and seed admin accounts from environment variables
getDb();
const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(e => e.trim());
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;

if (adminPassword && adminEmails.length === 0) {
  console.warn('[WARNING] ADMIN_EMAILS not set in environment. No admin accounts created.');
}

for (const email of adminEmails) {
  if (adminPassword) {
    ensureAdminUser(email.trim(), adminPassword);
  }
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://pattern-pilots-app.vercel.app',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(u => u.trim()) : []),
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Render health checks, mobile)
    if (!origin) return cb(null, true);
    // Allow any vercel.app preview/prod URL and any localhost
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/[\w-]+\.vercel\.app$/.test(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin)
    ) return cb(null, true);
    // Unknown origin — deny without 500 (browser will block, server stays healthy)
    return cb(null, false);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images
app.use('/api/lostfound/uploads', express.static(UPLOADS_DIR));

// Rate limiting - disabled for development
// In production, use a redis store instead of memory store
// const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } });
// app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/lostfound', lostFoundRoutes);
app.use('/api/groupchat', groupChatRoutes);
app.use('/api/notifications', notificationsRoutes);

// Activity log endpoint (for authenticated users)
app.get('/api/activity', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { email } = verifyAccessToken(authHeader.slice(7));
    const logs = getDb().prepare(
      'SELECT * FROM activity_log WHERE user_email = ? ORDER BY created_at DESC LIMIT 50'
    ).all(email);
    res.json({ logs });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
