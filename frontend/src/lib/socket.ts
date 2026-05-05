import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001'}/prices`, {
      autoConnect: false,
    });
  }
  return socket;
}

export function subscribePrices(tickers: string[], onUpdate: (data: any[]) => void) {
  const s = getSocket();
  s.connect();
  s.emit('subscribe', { tickers });
  s.on('prices', onUpdate);
  return () => {
    s.emit('unsubscribe');
    s.off('prices', onUpdate);
    s.disconnect();
  };
}
