import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import {
  Coins,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Info,
  Gift,
  HelpCircle,
} from 'lucide-react';

export const WalletDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { wallet, availableCoins, lifetimeEarned, lifetimeRedeemed, transactions, isLoading, refreshWallet } =
    useWallet();

  const [activeTab, setActiveTab] = useState<'ALL' | 'EARNED' | 'REDEEMED'>('ALL');
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'EARNED') return tx.type === 'EARNED';
    if (activeTab === 'REDEEMED') return tx.type === 'REDEEMED';
    return true;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* App Header */}
      <AppHeader title="Scrap Rewards Wallet" showBack={false} />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Top Hero Balance Card - Green and White aesthetic */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 p-6 text-white shadow-xl">
          {/* Subtle decorative circles */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-lg pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>10% Scrap Cashback Active</span>
              </div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-emerald-100">
                Available Reward Coins
              </h2>
            </div>
            <button
              onClick={() => refreshWallet()}
              disabled={isLoading}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative z-10 mt-3 flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
              {availableCoins.toLocaleString('en-IN')}
            </span>
            <span className="text-lg font-bold text-amber-300 flex items-center">
              Coins <Coins className="w-5 h-5 ml-1 text-amber-300 fill-amber-300 inline" />
            </span>
          </div>

          <p className="relative z-10 mt-1 text-xs text-emerald-100 flex items-center">
            <span>Worth ₹{availableCoins} shopping discount on Recycled Store (1 Coin = ₹1)</span>
          </p>

          {/* Quick Action Buttons */}
          <div className="relative z-10 mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/store')}
              className="flex items-center justify-center space-x-1.5 bg-white text-emerald-800 hover:bg-emerald-50 py-2.5 px-3 rounded-xl font-bold text-xs shadow-md transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
              <span>Shop Recycled Store</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center space-x-1.5 bg-emerald-800/80 hover:bg-emerald-800 border border-emerald-400/40 text-white py-2.5 px-3 rounded-xl font-bold text-xs transition active:scale-95"
            >
              <Coins className="w-4 h-4 text-amber-300" />
              <span>Sell Scrap & Earn</span>
            </button>
          </div>
        </div>

        {/* Lifetime Earnings & Redemption Stats */}
        <div className="grid grid-cols-2 gap-3">
          {/* Lifetime Earned */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Lifetime Earned
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              +{lifetimeEarned.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              From scrap deals
            </div>
          </div>

          {/* Total Redeemed */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Redeemed
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {lifetimeRedeemed.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Saved on purchases
            </div>
          </div>
        </div>

        {/* How Rewards Work Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start space-x-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs flex-shrink-0 mt-0.5">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-950">
                Scrapwala 10% Reward Guarantee
              </h3>
              <button
                onClick={() => setShowRuleModal(true)}
                className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center"
              >
                Rules <Info className="w-3 h-3 ml-0.5" />
              </button>
            </div>
            <p className="text-[11px] text-emerald-800/90 mt-1 leading-relaxed">
              Earn <strong>10 reward coins</strong> for every <strong>₹100</strong> of scrap sold. Verified by OTP upon pickup and credited automatically to your wallet.
            </p>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Wallet History</h3>
              <p className="text-[11px] text-slate-500">Every earning & redemption record</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                  activeTab === 'ALL'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('EARNED')}
                className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                  activeTab === 'EARNED'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Earned
              </button>
              <button
                onClick={() => setActiveTab('REDEEMED')}
                className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                  activeTab === 'REDEEMED'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Redeemed
              </button>
            </div>
          </div>

          {/* Transaction List */}
          {isLoading && transactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-500 font-semibold">Loading wallet transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Coins className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {activeTab === 'EARNED'
                    ? 'No earnings yet'
                    : activeTab === 'REDEEMED'
                    ? 'No redemptions yet'
                    : 'No wallet transactions yet'}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Book a scrap pickup today and get 10% back in reward coins automatically upon OTP verification!
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <span>Book Scrap Pickup</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const isEarned = tx.type === 'EARNED';
                return (
                  <div key={tx._id || tx.id || tx.referenceId} className="py-3.5 flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isEarned
                            ? 'bg-emerald-100/70 text-emerald-700'
                            : 'bg-amber-100/70 text-amber-700'
                        }`}
                      >
                        {isEarned ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 line-clamp-1">
                            {isEarned ? 'Scrap Deal Reward' : 'Recycled Store Discount'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {tx.description}
                        </p>

                        <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400">
                          <span className="font-mono">Ref: {tx.referenceId}</span>
                          <span>•</span>
                          <span>{formatDate(tx.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-3">
                      <span
                        className={`text-sm font-black inline-block px-2 py-0.5 rounded-lg ${
                          isEarned
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-amber-700 bg-amber-50'
                        }`}
                      >
                        {isEarned ? `+${tx.coins}` : `-${tx.coins}`} Coins
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">
                        Bal: {tx.balanceAfter}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Rules Information Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-emerald-800">
                <Coins className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-base text-slate-900">How Rewards Work</h3>
              </div>
              <button
                onClick={() => setShowRuleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="font-bold text-emerald-900">Conversion Rate:</div>
                <div className="text-emerald-800 mt-1 space-y-0.5">
                  <div>• ₹100 scrap deal = <strong>10 reward coins</strong></div>
                  <div>• ₹250 scrap deal = <strong>25 reward coins</strong></div>
                  <div>• ₹500 scrap deal = <strong>50 reward coins</strong></div>
                  <div>• ₹1,000 scrap deal = <strong>100 reward coins</strong></div>
                  <div className="text-[11px] text-emerald-700 font-mono mt-1">
                    Formula: floor(finalDealAmount * 0.10)
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p><strong>Verified Pickups Only:</strong> Reward coins are credited automatically once scrap is collected and OTP verification is completed.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p><strong>Instant Marketplace Discounts:</strong> 1 Reward Coin = ₹1 direct discount when purchasing products in the Recycled Store.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p><strong>Duplicate-Safe:</strong> Each transaction is credited exactly once with cryptographic audit log references.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRuleModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
};
