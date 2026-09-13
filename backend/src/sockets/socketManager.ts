import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { config } from '../config/index.js';
import { OrderStatus, DealerLiveLocationUpdate } from '../types/index.js';

let ioInstance: Server | null = null;

export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow client connections
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Socket Authentication & Connection Middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (token && typeof token === 'string') {
      try {
        const payload = verifyAccessToken(token);
        (socket as any).userId = payload.userId;
        (socket as any).phone = payload.phone;
      } catch (err) {
        console.warn('⚠️ Socket connection with invalid/expired token. Joining as guest/sim.');
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`🔌 Socket connected: ${socket.id} (User: ${userId || 'Anonymous'})`);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Allow consumer to join specific order room for live tracking & updates
    socket.on('join:order', ({ orderId }: { orderId: string }) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`📦 Socket ${socket.id} joined room: order:${orderId}`);
      }
    });

    socket.on('leave:order', ({ orderId }: { orderId: string }) => {
      if (orderId) {
        socket.leave(`order:${orderId}`);
        console.log(`👋 Socket ${socket.id} left room: order:${orderId}`);
      }
    });

    // Dealer room for simulator / dealer notifications
    socket.on('join:dealer', ({ dealerId }: { dealerId: string }) => {
      if (dealerId) {
        socket.join(`dealer:${dealerId}`);
        socket.join('dealers:all');
        console.log(`🚛 Dealer Socket ${socket.id} joined dealer room: ${dealerId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error('Socket.IO is not initialized! Call initSocketServer first.');
  }
  return ioInstance;
};

// Typed Event Dispatchers for Cross-Application Communication
export const socketEvents = {
  /**
   * Broadcast new order alert to dealer
   */
  emitNewPickupAlert: (dealerId: string, orderData: any) => {
    if (!ioInstance) return;
    ioInstance.to(`dealer:${dealerId}`).to('dealers:all').emit('pickup:new', {
      orderId: orderData.orderId,
      consumerId: orderData.consumerId,
      pickupAddress: orderData.pickupAddress,
      pickupLocation: orderData.pickupLocation,
      selectedMaterials: orderData.selectedMaterials,
      estimatedTotalAmount: orderData.estimatedTotalAmount,
      createdAt: orderData.createdAt,
    });
  },

  /**
   * Emit order status change to consumer and order room
   */
  emitOrderStatusUpdate: (
    orderId: string,
    consumerId: string,
    status: OrderStatus,
    extraData?: any
  ) => {
    if (!ioInstance) return;
    const payload = {
      orderId,
      status,
      timestamp: new Date(),
      ...extraData,
    };

    ioInstance.to(`order:${orderId}`).to(`user:${consumerId}`).emit('pickup:status', payload);

    if (status === 'ACCEPTED') {
      ioInstance.to(`order:${orderId}`).to(`user:${consumerId}`).emit('pickup:accepted', payload);
    } else if (status === 'REJECTED') {
      ioInstance.to(`order:${orderId}`).to(`user:${consumerId}`).emit('pickup:rejected', payload);
    } else if (status === 'OTP_VERIFIED') {
      ioInstance.to(`order:${orderId}`).to(`user:${consumerId}`).emit('pickup:otp_verified', payload);
    } else if (status === 'COMPLETED') {
      ioInstance.to(`order:${orderId}`).to(`user:${consumerId}`).emit('pickup:completed', payload);
    }
  },

  /**
   * Stream live dealer GPS location to consumer tracking screen
   */
  emitDealerLocation: (
    orderId: string,
    consumerId: string,
    locationData: DealerLiveLocationUpdate
  ) => {
    if (!ioInstance) return;
    ioInstance.to(`order:${orderId}`).to(`user:${consumerId}`).emit('dealer:location', {
      orderId,
      coordinates: locationData.coordinates,
      heading: locationData.heading || 0,
      speed: locationData.speed || 0,
      etaMinutes: locationData.etaMinutes,
      distanceKm: locationData.distanceKm,
      updatedAt: locationData.updatedAt,
    });
  },

  /**
   * Broadcast dealer online/offline presence or status update to all consumers
   */
  emitDealerStatusUpdate: (dealerId: string, isOnline: boolean, data?: any) => {
    if (!ioInstance) return;
    const payload = {
      dealerId,
      isOnline,
      timestamp: new Date(),
      ...data,
    };
    ioInstance.emit('dealer:status', payload);
    if (isOnline) {
      ioInstance.emit('dealer:online', payload);
    }
  },
};
