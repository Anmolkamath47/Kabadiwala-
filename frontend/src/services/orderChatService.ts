import { socketService } from './socketService';

export interface OrderChatMessage {
  id: string;
  orderId: string;
  sender: 'consumer' | 'dealer';
  senderName: string;
  text: string;
  timestamp: string;
  formattedTime: string;
}

type MessageListener = (messages: OrderChatMessage[]) => void;

class OrderChatService {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<MessageListener>> = new Map();
  private socketCleanups: Map<string, () => void> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('scrapwala_order_chat');
        this.channel.onmessage = (event) => {
          const msg: OrderChatMessage = event.data;
          if (msg && msg.orderId) {
            this.handleIncomingMessage(msg);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('scrapwala_chat_')) {
          const orderId = e.key.replace('scrapwala_chat_', '');
          this.notifyListeners(orderId);
        }
      });
    }
  }

  private getStorageKey(orderId: string): string {
    return `scrapwala_chat_${orderId}`;
  }

  public getMessages(orderId: string): OrderChatMessage[] {
    if (typeof window === 'undefined' || !orderId) return [];
    try {
      const raw = localStorage.getItem(this.getStorageKey(orderId));
      if (!raw) {
        const defaultMessages: OrderChatMessage[] = [
          {
            id: `msg_init_${orderId}`,
            orderId,
            sender: 'dealer',
            senderName: 'Dealer Partner',
            text: 'Hello! I am on the way with a certified digital scale. Please keep your scrap ready at the doorstep.',
            timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
            formattedTime: new Date(Date.now() - 3 * 60 * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ];
        this.saveMessages(orderId, defaultMessages);
        return defaultMessages;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveMessages(orderId: string, messages: OrderChatMessage[]): void {
    if (typeof window === 'undefined' || !orderId) return;
    try {
      localStorage.setItem(this.getStorageKey(orderId), JSON.stringify(messages));
    } catch (err) {
      console.warn('Failed to persist chat messages to localStorage:', err);
    }
  }

  public sendMessage(
    orderId: string,
    sender: 'consumer' | 'dealer',
    senderName: string,
    text: string
  ): OrderChatMessage {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Message cannot be empty');
    }

    const now = new Date();
    const message: OrderChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      orderId,
      sender,
      senderName,
      text: cleanText,
      timestamp: now.toISOString(),
      formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // 1. Save to local storage
    const current = this.getMessages(orderId);
    current.push(message);
    this.saveMessages(orderId, current);

    // 2. Broadcast across tabs via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('BroadcastChannel postMessage error:', err);
      }
    }

    // 3. Emit via Socket.IO if connected
    try {
      const socket = socketService.connect();
      if (socket && socket.connected) {
        socket.emit('order:chat:send', message);
      }
    } catch (err) {
      console.warn('Socket chat emission fallback warning:', err);
    }

    // 4. Notify local listeners in current window
    this.notifyListeners(orderId);

    return message;
  }

  private handleIncomingMessage(msg: OrderChatMessage): void {
    const current = this.getMessages(msg.orderId);
    // Prevent duplicate messages
    if (!current.some((m) => m.id === msg.id)) {
      current.push(msg);
      this.saveMessages(msg.orderId, current);
    }
    this.notifyListeners(msg.orderId);
  }

  private notifyListeners(orderId: string): void {
    const orderListeners = this.listeners.get(orderId);
    if (orderListeners && orderListeners.size > 0) {
      const updatedMessages = this.getMessages(orderId);
      orderListeners.forEach((listener) => {
        try {
          listener(updatedMessages);
        } catch (err) {
          console.error('Error in chat message listener:', err);
        }
      });
    }
  }

  public subscribe(orderId: string, listener: MessageListener): () => void {
    if (!this.listeners.has(orderId)) {
      this.listeners.set(orderId, new Set());
    }
    this.listeners.get(orderId)!.add(listener);

    // Provide initial messages immediately
    listener(this.getMessages(orderId));

    // Connect socket listener for this order if available
    if (!this.socketCleanups.has(orderId)) {
      try {
        const cleanup = socketService.on('order:chat:message', (data: any) => {
          if (data && data.orderId === orderId) {
            this.handleIncomingMessage({
              id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              orderId: data.orderId,
              sender: data.sender || 'dealer',
              senderName: data.senderName || 'Partner',
              text: data.text || '',
              timestamp: data.timestamp || new Date().toISOString(),
              formattedTime: new Date(data.timestamp || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            });
          }
        });
        this.socketCleanups.set(orderId, cleanup);
      } catch (err) {
        console.warn('Socket chat subscription warning:', err);
      }
    }

    return () => {
      const set = this.listeners.get(orderId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(orderId);
          const cleanup = this.socketCleanups.get(orderId);
          if (cleanup) {
            cleanup();
            this.socketCleanups.delete(orderId);
          }
        }
      }
    };
  }
}

export const orderChatService = new OrderChatService();
