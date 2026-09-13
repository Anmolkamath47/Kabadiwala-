import { io, Socket } from 'socket.io-client';
import { OrderStatus, DealerLiveLocation } from '../types';

const isPrivateNetworkHost = (host: string): boolean => {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host);
};

const resolveSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return envUrl.replace(/\/$/, '');
      }
      if (typeof window !== 'undefined' && window.location) {
        const currentHost = window.location.hostname;
        if (isPrivateNetworkHost(currentHost)) {
          parsed.hostname = currentHost;
          return parsed.toString().replace(/\/$/, '');
        }
      }
      return envUrl.replace(/\/$/, '');
    } catch {
      return envUrl;
    }
  }

  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname;
    if (isPrivateNetworkHost(currentHost)) {
      return `http://${currentHost}:5000`;
    }
    if (window.location.protocol === 'https:' || currentHost.includes('vercel.app')) {
      return 'https://kabadiwala-backend.onrender.com';
    }
  }

  return 'http://localhost:5000';
};

const SOCKET_URL = resolveSocketUrl();

class SocketService {
  private socket: Socket | null = null;
  private currentOrderId: string | null = null;

  connect(token?: string) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const authToken = token || localStorage.getItem('kabadiwala_token') || '';

    this.socket = io(SOCKET_URL, {
      auth: { token: authToken },
      query: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket.IO Connected to Kabadiwala Server:', this.socket?.id);
      if (this.currentOrderId) {
        this.joinOrderRoom(this.currentOrderId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO Disconnected:', reason);
    });

    return this.socket;
  }

  joinOrderRoom(orderId: string) {
    this.currentOrderId = orderId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join:order', { orderId });
      console.log(`📦 Joined order room: ${orderId}`);
    }
  }

  leaveOrderRoom(orderId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave:order', { orderId });
    }
    if (this.currentOrderId === orderId) {
      this.currentOrderId = null;
    }
  }

  onOrderStatus(callback: (data: { orderId: string; status: OrderStatus; order?: any; note?: string; finalTotalAmount?: number }) => void) {
    if (!this.socket) this.connect();
    this.socket?.on('pickup:status', callback);
    return () => {
      this.socket?.off('pickup:status', callback);
    };
  }

  onDealerLocation(callback: (data: DealerLiveLocation & { orderId: string }) => void) {
    if (!this.socket) this.connect();
    this.socket?.on('dealer:location', callback);
    return () => {
      this.socket?.off('dealer:location', callback);
    };
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
    return () => {
      this.socket?.off(event, callback);
    };
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
