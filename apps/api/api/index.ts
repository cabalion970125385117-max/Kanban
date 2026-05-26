import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from '../src/config/env';
import { testConnection } from '../src/config/db';
import { connectRedis } from '../src/config/redis';
import { errorHandler } from '../src/middleware/errorHandler';
import { apiRateLimit } from '../src/middleware/rateLimit';
import authRoutes from '../src/routes/auth';
import usersRoutes from '../src/routes/users';

const app = express();

app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check bypasses init so Vercel can probe before DB is warm
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Lazy-init DB + Redis once per cold start
let initialized = false;
async function ensureInit(): Promise<void> {
  if (initialized) return;
  await testConnection();
  await connectRedis();
  initialized = true;
}

app.use(async (_req, res, next) => {
  try {
    await ensureInit();
    next();
  } catch (err) {
    console.error('Init error:', err);
    res.status(503).json({ error: 'Service unavailable, please retry' });
  }
});

app.use('/api', apiRateLimit);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use(errorHandler);

export default app;
