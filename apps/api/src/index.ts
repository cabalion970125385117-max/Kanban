import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { testConnection } from './config/db';
import { connectRedis } from './config/redis';
import { initSocket } from './socket/index';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimit } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';

const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// cookie-parser needs to be installed separately
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app.use(require('cookie-parser')());
} catch {
  console.warn('cookie-parser not found, refresh token cookies may not work');
}

app.use('/api', apiRateLimit);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await testConnection();
    await connectRedis();
    initSocket(httpServer);
    httpServer.listen(env.PORT, () => {
      console.log(`QuestBoard API running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
