import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './useAuth';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (!socket || !socket.connected) {
    socket?.disconnect();
    socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Suscribirse a un evento de Socket.IO mientras el componente este montado */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const fn = (payload: T) => handlerRef.current(payload);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event]);
}
