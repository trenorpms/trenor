'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export function useRealtime(user: any, onNotificationReceived?: (n: RealtimeNotification) => void) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user || !user.email) return;

    // Establish WebSocket connection to backend namespace 'realtime'
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const wsUrl = apiBase.replace(/\/api$/, '') + '/realtime';
    const newSocket = io(wsUrl, {
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Real-time socket link connected.');
      
      // Register current user session channel
      newSocket.emit('register', {
        identifier: user.role === 'landlord' ? user.id : user.email,
        role: user.role,
      });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Real-time socket link disconnected.');
    });

    newSocket.on('notification', (data: RealtimeNotification) => {
      setNotifications((prev) => [data, ...prev].slice(0, 50));
      if (onNotificationReceived) {
        onNotificationReceived(data);
      }
    });

    return () => {
      newSocket.close();
    };
  }, [user?.email, user?.id, user?.role]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return { socket, connected, notifications, clearNotifications };
}
