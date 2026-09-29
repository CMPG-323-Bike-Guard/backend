import type { Server as HttpServer } from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config';
import type { RealtimeEvent } from './types';

let io: SocketIoServer | null = null;

export function initRealtime(httpServer: HttpServer): SocketIoServer {
  io = new SocketIoServer(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next();
    try {
      jwt.verify(token, config.jwtSecret);
      next();
    } catch {
      next(new Error('unauthenticated'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => undefined);
  });

  return io;
}

export function emitRealtime(event: RealtimeEvent): void {
  io?.emit('gate-event', event);
}
