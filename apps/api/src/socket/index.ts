import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { setupBoardHandlers } from './board.socket';
import { setupCursorHandler } from './cursor.socket';

export type AppSocket = Socket & { userId: string; userName: string };

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; name: string };
      const s = socket as AppSocket;
      s.userId = payload.sub;
      s.userName = payload.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const s = socket as AppSocket;
    setupBoardHandlers(s);
    setupCursorHandler(s);
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToBoard(boardId: string, event: string, data: unknown): void {
  getIo().to(`board:${boardId}`).emit(event, data);
}
