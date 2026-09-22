import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function connectChat(email, onMessage, onSeen) {
  const socket = io(SOCKET_URL, { transports: ['websocket'] });
  socket.emit('join-room', email);
  socket.on('chat-message', onMessage);
  if (onSeen) socket.on('message-seen', onSeen);
  return socket;
}
