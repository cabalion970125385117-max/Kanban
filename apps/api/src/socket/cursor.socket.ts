import type { AppSocket } from './index';

export function setupCursorHandler(socket: AppSocket): void {
  let lastEmit = 0;

  socket.on('cursor:move', ({ x, y }: { x: number; y: number }) => {
    const now = Date.now();
    if (now - lastEmit < 60) return;
    lastEmit = now;

    const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));
    rooms.forEach((room) => {
      socket.to(room).emit('cursor:move', { userId: socket.userId, x, y });
    });
  });
}
