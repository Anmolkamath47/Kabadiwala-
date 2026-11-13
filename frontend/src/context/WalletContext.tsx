import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { walletService } from '../services/walletService';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { WalletData, WalletTransaction } from '../types';

interface WalletContextType {
  wallet: WalletData | null;
  availableCoins: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  transactions: WalletTransaction[];
  isLoading: boolean;
  refreshWallet: () => Promise<void>;
  rewardAlert: { coins: number; orderId: string } | null;
  clearRewardAlert: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rewardAlert, setRewardAlert] = useState<{ coins: number; orderId: string } | null>(null);

  const refreshWallet = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const data = await walletService.getWalletDashboard(1, 20);
      setWallet(data.wallet);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshWallet();
    } else {
      setWallet(null);
      setTransactions([]);
    }
  }, [isAuthenticated, refreshWallet]);

  // Real-time WebSocket listener for live coin credits and redemptions
  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanup = socketService.onWalletUpdate((payload: any) => {
      console.log('🪙 Real-time wallet update received:', payload);
      setWallet((prev) => ({
        availableCoins: payload.availableCoins,
        lifetimeEarned: payload.lifetimeEarned ?? (prev?.lifetimeEarned || 0),
        lifetimeRedeemed: payload.lifetimeRedeemed ?? (prev?.lifetimeRedeemed || 0),
        updatedAt: new Date().toISOString(),
      }));

      // If this was an earned reward from scrap deal
      if (payload.rewardCoinsCredited && payload.rewardCoinsCredited > 0) {
        setRewardAlert({
          coins: payload.rewardCoinsCredited,
          orderId: payload.orderId || 'Scrap Pickup',
        });
      }

      // Re-fetch transactions list
      walletService.getWalletDashboard(1, 20).then((data) => {
        setTransactions(data.transactions || []);
      }).catch(() => {});
    });

    return () => {
      cleanup();
    };
  }, [isAuthenticated]);

  const clearRewardAlert = () => setRewardAlert(null);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        availableCoins: wallet?.availableCoins || 0,
        lifetimeEarned: wallet?.lifetimeEarned || 0,
        lifetimeRedeemed: wallet?.lifetimeRedeemed || 0,
        transactions,
        isLoading,
        refreshWallet,
        rewardAlert,
        clearRewardAlert,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
