import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Order, DealerLiveLocation } from '../types';
import { orderService } from '../services/orderService';
import { ratingService } from '../services/ratingService';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';

interface OrderContextType {
  activeOrder: Order | null;
  orders: Order[];
  isLoading: boolean;
  dealerLiveLocation: DealerLiveLocation | null;
  createNewOrder: (orderData: any) => Promise<Order>;
  cancelOrder: (orderId: string, reason?: string) => Promise<Order>;
  fetchOrder: (orderId: string) => Promise<Order | null>;
  fetchOrdersHistory: () => Promise<void>;
  submitRating: (orderId: string, score: number, feedback?: string, tags?: string[]) => Promise<void>;
  setActiveOrder: (order: Order | null) => void;
  toastMessage: string | null;
  clearToast: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => {
    const saved = localStorage.getItem('kabadiwala_active_order');
    return saved ? JSON.parse(saved) : null;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dealerLiveLocation, setDealerLiveLocation] = useState<DealerLiveLocation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const clearToast = () => setToastMessage(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Keep local storage synced with active order
  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem('kabadiwala_active_order', JSON.stringify(activeOrder));
    } else {
      localStorage.removeItem('kabadiwala_active_order');
    }
  }, [activeOrder]);

  // Real-time Socket.IO subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanupStatus = socketService.onOrderStatus((data) => {
      console.log('📡 Real-time Order Status Update:', data);

      setActiveOrder((prev) => {
        if (prev && prev.orderId === data.orderId) {
          return {
            ...prev,
            status: data.status,
            ...(data.order ? data.order : {}),
            ...(data.finalTotalAmount ? { finalTotalAmount: data.finalTotalAmount } : {}),
          };
        }
        return prev;
      });

      if (data.order?.dealerLiveLocation) {
        setDealerLiveLocation(data.order.dealerLiveLocation);
      }

      // Notify user with audio/toast feedback
      if (data.status === 'ACCEPTED') {
        showToast('🎉 Dealer accepted your scrap pickup request!');
      } else if (data.status === 'DEALER_EN_ROUTE') {
        showToast('🚚 Dealer is en route to your location!');
      } else if (data.status === 'ARRIVED') {
        showToast('📍 Dealer has reached your doorstep! Share your OTP.');
      } else if (data.status === 'OTP_VERIFIED') {
        showToast('✅ OTP Verified! Scrap weighing and loading in progress.');
      } else if (data.status === 'COMPLETED') {
        showToast('💰 Pickup Completed! Please rate your scrap dealer.');
      } else if (data.status === 'REJECTED' || data.status === 'CANCELLED') {
        showToast('⚠️ Order cancelled or rejected.');
      }
    });

    const cleanupLocation = socketService.onDealerLocation((data) => {
      console.log('📍 Live Dealer GPS ping:', data);
      setDealerLiveLocation({
        coordinates: data.coordinates,
        heading: data.heading,
        speed: data.speed,
        etaMinutes: data.etaMinutes,
        distanceKm: data.distanceKm,
        updatedAt: data.updatedAt,
      });
    });

    return () => {
      cleanupStatus();
      cleanupLocation();
    };
  }, [isAuthenticated]);

  // Join active order room on order switch
  useEffect(() => {
    if (activeOrder?.orderId) {
      socketService.joinOrderRoom(activeOrder.orderId);
    }
  }, [activeOrder?.orderId]);

  const createNewOrder = async (orderData: any): Promise<Order> => {
    setIsLoading(true);
    try {
      const order = await orderService.createOrder(orderData);
      setActiveOrder(order);
      setIsLoading(false);
      return order;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const cancelOrder = async (orderId: string, reason?: string): Promise<Order> => {
    setIsLoading(true);
    try {
      const updated = await orderService.cancelOrder(orderId, reason);
      setActiveOrder((prev) => (prev?.orderId === orderId ? updated : prev));
      setIsLoading(false);
      return updated;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const fetchOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      const order = await orderService.getOrderDetails(orderId);
      if (order) {
        if (order.dealerLiveLocation) {
          setDealerLiveLocation(order.dealerLiveLocation);
        }
        setActiveOrder((prev) => {
          if (!prev || prev.orderId === orderId) {
            return order;
          }
          return prev;
        });
      }
      return order;
    } catch (error) {
      console.error('Failed to fetch order:', error);
      return null;
    }
  }, []);

  const fetchOrdersHistory = async () => {
    setIsLoading(true);
    try {
      const res = await orderService.getConsumerOrders();
      setOrders(res.orders);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Failed to fetch orders history:', error);
    }
  };

  const submitRating = async (
    orderId: string,
    score: number,
    feedback?: string,
    tags?: string[]
  ) => {
    setIsLoading(true);
    try {
      await ratingService.submitRating({ orderId, score, feedback, tags });
      if (activeOrder?.orderId === orderId) {
        setActiveOrder({ ...activeOrder, rated: true });
      }
      setIsLoading(false);
      showToast('⭐ Thank you for rating the scrap dealer!');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <OrderContext.Provider
      value={{
        activeOrder,
        orders,
        isLoading,
        dealerLiveLocation,
        createNewOrder,
        cancelOrder,
        fetchOrder,
        fetchOrdersHistory,
        submitRating,
        setActiveOrder,
        toastMessage,
        clearToast,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
