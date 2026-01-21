import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TestExecutionGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinFlow')
  handleJoinFlow(
    @MessageBody() data: { flowId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.flowId) return;
    client.join(`flow:${data.flowId}`);
  }

  @SubscribeMessage('leaveFlow')
  handleLeaveFlow(
    @MessageBody() data: { flowId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.flowId) return;
    client.leave(`flow:${data.flowId}`);
  }

  emitFlowStatus(payload: {
    flowId: string;
    status: string;
    lastRun?: Date;
    duration?: number;
    resultId?: string;
  }) {
    this.server.to(`flow:${payload.flowId}`).emit('flowStatus', payload);
  }
}
