import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PricesService } from '../prices/prices.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/prices' })
export class PricesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(PricesGateway.name);
  private subscriptions = new Map<string, NodeJS.Timeout>();

  constructor(private pricesService: PricesService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const timer = this.subscriptions.get(client.id);
    if (timer) {
      clearInterval(timer);
      this.subscriptions.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { tickers: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const { tickers } = data;
    this.logger.log(`${client.id} subscribed to: ${tickers.join(', ')}`);

    const existing = this.subscriptions.get(client.id);
    if (existing) clearInterval(existing);

    const push = async () => {
      const quotes = await this.pricesService.getMultipleQuotes(tickers);
      client.emit('prices', quotes);
    };

    await push();
    const timer = setInterval(push, 30_000); // refresh every 30s
    this.subscriptions.set(client.id, timer);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    const timer = this.subscriptions.get(client.id);
    if (timer) {
      clearInterval(timer);
      this.subscriptions.delete(client.id);
    }
  }
}
