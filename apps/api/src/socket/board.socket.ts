import type { AppSocket } from './index';

export function setupBoardHandlers(socket: AppSocket): void {
  socket.on('join:board', ({ boardId }: { boardId: string }) => {
    socket.join(`board:${boardId}`);
    socket.to(`board:${boardId}`).emit('user:joined', {
      userId: socket.userId,
      name: socket.userName,
    });
  });

  socket.on('leave:board', ({ boardId }: { boardId: string }) => {
    socket.leave(`board:${boardId}`);
    socket.to(`board:${boardId}`).emit('user:left', { userId: socket.userId });
  });

  socket.on('typing:start', ({ cardId }: { cardId: string }) => {
    const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));
    rooms.forEach((room) => {
      socket.to(room).emit('typing:start', { userId: socket.userId, cardId });
    });
  });

  socket.on('typing:stop', ({ cardId }: { cardId: string }) => {
    const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));
    rooms.forEach((room) => {
      socket.to(room).emit('typing:stop', { userId: socket.userId, cardId });
    });
  });

  socket.on('disconnect', () => {
    const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));
    rooms.forEach((room) => {
      socket.to(room).emit('user:left', { userId: socket.userId });
    });
  });
}
