import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrder } from '../context/OrderContext';
import { dealerService } from '../services/dealerService';
import { Dealer, ScrapCategory } from '../types';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { DealerCard } from '../components/dealer/DealerCard';
import { DealerDetailsModal } from '../components/dealer/DealerDetailsModal';
import { Toast } from '../components/common/Toast';
import {
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Scale,
  Truck,
  ShieldCheck,
  IndianRupee,
  Navigation,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { selectedLocation } = useAuth();
  const { activeOrder } = useOrder();

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<ScrapCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDealerForModal, setSelectedDealerForModal] = useState<Dealer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const categories: Array<{ id: ScrapCategory | 'ALL'; name: string; icon: string }> = [
    { id: 'ALL', name: 'All Scrap', icon: '♻️' },
    { id: 'Paper', name: 'Newspaper', icon: '📰' },
    { id: 'Cardboard', name: 'Cardboard', icon: '📦' },
    { id: 'Plastic', name: 'Plastics', icon: '🧴' },
    { id: 'Metal', name: 'Iron & Steel', icon: '⚙️' },
    { id: 'Aluminium', name: 'Aluminium', icon: '🥫' },
    { id: 'Copper', name: 'Copper Wire', icon: '⚡' },
    { id: 'E-Waste', name: 'E-Waste', icon: '💻' },
    { id: 'Glass', name: 'Bottles', icon: '🍾' },
  ];

  const fetchDealers = async () => {
    setIsLoading(true);
    try {
      const [lng, lat] = selectedLocation?.coordinates || [77.2150, 28.6250];
      const categoryParam = selectedCategory === 'ALL' ? undefined : selectedCategory;
      const data = await dealerService.getNearbyDealers(lat, lng, 15, categoryParam);
      setDealers(data.dealers || []);
    } catch (err) {
      console.error('Failed to fetch nearby dealers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDealers();
  }, [selectedLocation, selectedCategory]);

  const handleSelectDealer = (dealer: Dealer) => {
    navigate('/booking-confirm', { state: { dealer } });
  };

  const handleOpenDetails = (dealer: Dealer) => {
    setSelectedDealerForModal(dealer);
    setIsModalOpen(true);
  };

  const filteredDealers = dealers.filter((d) =>
    d.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.scrapRates.some((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between max-w-md mx-auto relative pb-20 shadow-2xl">
      <AppHeader />
      <Toast />

      <main className="flex-1 p-4 space-y-4">
        {/* Active Order Banner if order is live */}
        {activeOrder && ['PENDING', 'ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED', 'OTP_PENDING', 'OTP_VERIFIED'].includes(activeOrder.status) && (
          <div
            onClick={() => navigate(`/order/${activeOrder.orderId}`)}
            className="bg-gradient-to-r from-emerald-800 to-slate-900 text-white p-3.5 rounded-2xl shadow-lg border border-emerald-700/50 cursor-pointer flex items-center justify-between animate-pulse-subtle"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Active Pickup in Progress</div>
                <div className="text-[11px] text-emerald-300 truncate mt-0.5">
                  Order #{activeOrder.orderId} · {activeOrder.status}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-300 bg-white/10 px-2.5 py-1 rounded-lg">
              Track Live →
            </span>
          </div>
        )}

        {/* Hero Pickup Guarantee Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-1.5 text-emerald-200 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>DOORSTEP SCRAP COLLECTION</span>
            </div>
            <h2 className="text-xl font-extrabold mt-1 leading-tight">
              Sell Scrap at Verified Market Rates
            </h2>
            <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
              Certified electronic scales · Free doorstep pickup · Instant cash or UPI payment
            </p>

            {/* Quick 3 Feature Pills */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-500/40 text-[10px] font-semibold text-emerald-100">
              <div className="flex items-center space-x-1">
                <Scale className="w-3.5 h-3.5 text-amber-300" />
                <span>Exact Weight</span>
              </div>
              <div className="flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 text-emerald-200" />
                <span>Fast Arrival</span>
              </div>
              <div className="flex items-center space-x-1">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-300" />
                <span>Best Rates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by scrap material (e.g. Copper, Paper, Iron)..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-2xs transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Scrap Categories
            </h3>
            <span className="text-[11px] text-slate-400">Live Rates</span>
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nearby Active Dealers Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h3 className="text-sm font-black text-slate-900">Active Nearby Dealers</h3>
              <p className="text-[11px] text-slate-500">
                Ready for instant scrap pickup in your area
              </p>
            </div>
            <button
              onClick={fetchDealers}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh nearby dealers"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold">Finding nearby scrap dealers...</p>
            </div>
          ) : filteredDealers.length === 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-2 shadow-2xs">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Truck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No active dealers found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No scrap dealers are active within 15 km with the selected criteria. Try changing category or location.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDealers.map((dealer) => (
                <DealerCard
                  key={dealer.dealerId}
                  dealer={dealer}
                  onSelect={handleSelectDealer}
                  onViewDetails={handleOpenDetails}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Dealer Details Modal */}
      <DealerDetailsModal
        dealer={selectedDealerForModal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookNow={handleSelectDealer}
      />

      <BottomNav />
    </div>
  );
};
