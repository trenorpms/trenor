import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'realtime',
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Active client maps
  private activeClients = new Map<string, string>(); // socketId -> channel

  handleConnection(client: Socket) {
    console.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket disconnected: ${client.id}`);
    this.activeClients.delete(client.id);
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: { identifier: string; role: string }) {
    if (!payload || !payload.identifier) return;

    const channel = payload.role === 'landlord' 
      ? `landlord:${payload.identifier}` 
      : `tenant:${payload.identifier}`;

    client.join(channel);
    this.activeClients.set(client.id, channel);
    console.log(`Registered client ${client.id} on channel ${channel}`);
    
    // Send confirmation welcome back
    client.emit('notification', {
      id: `system-${Math.random().toString(36).substring(7)}`,
      title: 'Real-time Link Active',
      message: 'You are now connected to the autonomous sync network.',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info'
    });
  }

  // Broadcast function to notify specific landlord or tenant channels
  sendNotification(identifier: string, role: 'landlord' | 'tenant', notification: { id?: string; title: string; message: string; type: string }) {
    const channel = role === 'landlord' ? `landlord:${identifier}` : `tenant:${identifier}`;
    const notifPayload = {
      id: notification.id || `notif-${Math.random().toString(36).substring(7)}`,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      timestamp: new Date().toLocaleTimeString()
    };

    if (this.server) {
      this.server.to(channel).emit('notification', notifPayload);
      console.log(`Dispatched real-time event to ${channel}:`, notifPayload);
    } else {
      console.warn('RealtimeGateway server not initialized yet.');
    }
  }

  sendAgentBlock(identifier: string, role: 'landlord' | 'tenant', block: any) {
    const channel = role === 'landlord' ? `landlord:${identifier}` : `tenant:${identifier}`;
    if (this.server) {
      this.server.to(channel).emit('agent-block', { block });
      console.log(`Dispatched real-time agent-block to ${channel}:`, block);
    } else {
      console.warn('RealtimeGateway server not initialized yet.');
    }
  }
}
