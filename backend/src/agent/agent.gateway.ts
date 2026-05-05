import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/agent' })
export class AgentGateway {
  @WebSocketServer() server: Server;

  notifyBuy(userId: string, data: {
    coin: string;
    amountUsdt: number;
    avgPrice: number;
    orderId: string;
  }) {
    if (!this.server) return;
    this.server.emit(`buy:${userId}`, data);
  }

  notifyError(userId: string, coin: string, error: string) {
    if (!this.server) return;
    this.server.emit(`error:${userId}`, { coin, error });
  }
}
