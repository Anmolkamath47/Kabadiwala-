import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrder } from '../context/OrderContext';
import { dealerService } from '../services/dealerService';
import { socketService } from '../services/socketService';
import { Dealer, ScrapCategory } from '../types';
import { reconcileCityCoordinates } from '../utils/geoUtils';
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
  Compass,
  Radio,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { selectedLocation, setSelectedLocation, detectCurrentLocation } = useAuth();
  const { activeOrder } = useOrder();

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [searchRadius, setSearchRadius] = useState<number>(15);
  const [selectedCategory, setSelectedCategory] = useState<ScrapCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDealerForModal, setSelectedDealerForModal] = useState<Dealer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());

  const isMountedRef = useRef<boolean>(true);

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

  const fetchDealers = useCallback(
    async (showSpinner: boolean = true) => {
      if (showSpinner) setIsLoading(true);
      try {
        const rawCoords = selectedLocation?.coordinates || [77.2150, 28.6250];
        const [lng, lat] = reconcileCityCoordinates(selectedLocation?.address, rawCoords);
        const categoryParam = selectedCategory === 'ALL' ? undefined : selectedCategory;

        // 1. Fetch dealers within current search radius
        const data = await dealerService.getNearbyDealers(lat, lng, searchRadius, categoryParam);
        if (isMountedRef.current) {
          setDealers(data.dealers || []);
          setLastUpdatedTime(new Date());

          // If expanded search found 0 dealers, reset radius to standard 15km
          if ((!data.dealers || data.dealers.length === 0) && searchRadius > 25) {
            setSearchRadius(15);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dealers:', err);
      } finally {
        if (isMountedRef.current && showSpinner) {
          setIsLoading(false);
        }
      }
    },
    [selectedLocation, selectedCategory, searchRadius]
  );

  // Initial & Dependency-based fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchDealers(true);
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchDealers]);

  // Real-time Background Polling (Every 12s when tab is active)
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDealers(false);
      }
    }, 12000);
    return () => clearInterval(timer);
  }, [fetchDealers]);

  // Cross-App Live Synchronization via BroadcastChannel & Storage events
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('kabadiwala_cross_app_sync');
      channel.onmessage = (event) => {
        console.log('📡 [CrossAppSync] Received partner dealer event:', event.data);
        fetchDealers(false);
      };
    } catch {
      // Ignored if BroadcastChannel unsupported
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kabadidealer_dealer' || e.key === 'kabadiwala_pickup_location') {
        fetchDealers(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Socket listeners for dealer online/status updates
    const handleSocketStatus = () => fetchDealers(false);
    socketService.on('dealer:status', handleSocketStatus);
    socketService.on('dealer:online', handleSocketStatus);
    socketService.on('dealer:location', handleSocketStatus);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
      socketService.off('dealer:status', handleSocketStatus);
      socketService.off('dealer:online', handleSocketStatus);
      socketService.off('dealer:location', handleSocketStatus);
    };
  }, [fetchDealers]);

  // Auto-detect GPS location handler
  const handleDetectGPS = async () => {
    setIsDetectingGps(true);
    try {
      const detected = await detectCurrentLocation();
      if (detected) {
        setSearchRadius(15);
      } else {
        alert('Could not detect GPS location. Please check browser location permissions or choose an address manually.');
      }
    } finally {
      setIsDetectingGps(false);
    }
  };


  const handleSelectDealer = (dealer: Dealer) => {
    navigate('/booking-confirm', { state: { dealer } });
  };

  const handleOpenDetails = (dealer: Dealer) => {
    setSelectedDealerForModal(dealer);
    setIsModalOpen(true);
  };

  const filteredDealers = dealers.filter(
    (d) =>
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
            <div className="mt-3 flex items-center space-x-3 text-[11px] font-semibold text-emerald-50">
              <span className="flex items-center space-x-1">
                <Scale className="w-3.5 h-3.5 text-emerald-300" />
                <span>Zero Rigging</span>
              </span>
              <span>·</span>
              <span className="flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 text-emerald-300" />
                <span>30-Min Pickup</span>
              </span>
              <span>·</span>
              <span className="flex items-center space-x-1">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-300" />
                <span>Spot Cash</span>
              </span>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Search & Filter Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by scrap name (newspaper, copper, iron)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
        </div>

        {/* Scrap Categories Horizontal Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Scrap Material Rates
            </h3>
            <span className="text-[11px] text-emerald-700 font-bold">Live Rates/kg</span>
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex-shrink-0 shadow-2xs ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Radius Filter Pills (When search radius is customized) */}
        {searchRadius > 15 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-800 font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
              <span>Expanded View: All Active Dealers ({dealers.length} Found)</span>
            </div>
            <button
              onClick={() => setSearchRadius(15)}
              className="text-[11px] font-extrabold text-emerald-700 hover:underline bg-white px-2 py-0.5 rounded-md border border-emerald-200"
            >
              Reset to 15 km
            </button>
          </div>
        )}

        {/* Nearby Active Dealers Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-black text-slate-900">Active Nearby Dealers</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500">
                {searchRadius > 25
                  ? 'Showing all active scrap collectors across cities'
                  : `Within ${searchRadius} km of ${selectedLocation?.label || 'your location'}`}
              </p>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => fetchDealers(true)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs"
                title="Refresh nearby dealers"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold">Finding active scrap dealers...</p>
            </div>
          ) : filteredDealers.length === 0 ? (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3.5 shadow-xs text-center">
              <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <Truck className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-800">
                  No active dealers within {searchRadius} km
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Current location: <span className="font-semibold text-slate-700">{selectedLocation?.address || 'Default Area'}</span>
                </p>
              </div>

              <div className="pt-1">
                <button
                  onClick={handleDetectGPS}
                  disabled={isDetectingGps}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Compass className={`w-3.5 h-3.5 text-emerald-400 ${isDetectingGps ? 'animate-spin' : ''}`} />
                  <span>{isDetectingGps ? 'Detecting GPS...' : 'Use My Current GPS Location'}</span>
                </button>
              </div>
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
