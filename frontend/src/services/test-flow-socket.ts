import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getTestFlowSocket = (): Socket => {
  if (!socket) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    socket = io(baseUrl, {
      transports: ['websocket'],
      withCredentials: true,
    });
  }
  return socket;
};
