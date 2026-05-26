import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

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
      (socket as Socket & { userId: string; userName: string }).userId = payload.sub;
      (socket as Socket & { userId: string; userName: string }).userName = payload.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const s = socket as Socket & { userId: string; userName: string };

    socket.on('join:board', ({ boardId }: { boardId: string }) => {
      socket.join(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:joined', { userId: s.userId, name: s.userName });
    });

    socket.on('leave:board', ({ boardId }: { boardId: string }) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:left', { userId: s.userId });
    });

    socket.on('cursor:move', ({ x, y }: { x: number; y: number }) => {
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));
      rooms.forEach((room) => {
        socket.to(room).emit('cursor:move', { userId: s.userId, x, y });
      });
    });

    socket.on('typing:start', ({ cardId }: { cardId: string }) => {
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));
      rooms.forEach((room) => {
        socket.to(room).emit('typing:start', { userId: s.userId, cardId });
      });
    });

    socket.on('typing:stop', ({ cardId }: { cardId: string }) => {
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));
      rooms.forEach((room) => {
        socket.to(room).emit('typing:stop', { userId: s.userId, cardId });
      });
    });

    socket.on('disconnect', () => {
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));
      rooms.forEach((room) => {
        socket.to(room).emit('user:left', { userId: s.userId });
      });
    });
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
