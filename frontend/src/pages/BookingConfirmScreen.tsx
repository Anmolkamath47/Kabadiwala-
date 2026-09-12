import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrder } from '../context/OrderContext';
import { Dealer, SelectedMaterialItem } from '../types';
import { MaterialSelector } from '../components/order/MaterialSelector';
import {
  ArrowLeft,
  MapPin,
  Star,
  Truck,
  ShieldCheck,
  FileText,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const BookingConfirmScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedLocation } = useAuth();
  const { activeOrder, createNewOrder } = useOrder();

  // Recover dealer from location.state or sessionStorage fallback to handle reloads
  const [dealer] = useState<Dealer | null>(() => {
    const passed = (location.state as any)?.dealer as Dealer;
    if (passed) {
      try {
        sessionStorage.setItem('kabadiwala_pending_dealer', JSON.stringify(passed));
      } catch {}
      return passed;
    }
    try {
      const saved = sessionStorage.getItem('kabadiwala_pending_dealer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialItem[]>(() => {
    if (!dealer || !dealer.scrapRates || dealer.scrapRates.length === 0) return [];
    // Pre-select first 2 materials for convenience
    return dealer.scrapRates.slice(0, 2).map((r) => ({
      category: r.category,
      name: r.name,
      unit: r.unit,
      pricePerKg: r.pricePerKg,
      estimatedWeightKg: r.minQuantityKg || 5,
      calculatedAmount: Math.round((r.minQuantityKg || 5) * r.pricePerKg),
    }));
  });

  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If there's already an active order in progress (e.g. accepted by dealer), redirect to live tracking
  if (
    activeOrder &&
    ['PENDING', 'ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED', 'OTP_PENDING', 'OTP_VERIFIED'].includes(activeOrder.status)
  ) {
    return <Navigate to={`/order/${activeOrder.orderId}`} replace />;
  }

  // If no dealer selected, redirect to home safely via Navigate
  if (!dealer) {
    return <Navigate to="/" replace />;
  }

  const handleCreateOrder = async () => {
    if (selectedMaterials.length === 0) {
      setError('Please select at least one scrap material to sell.');
      return;
    }

    if (!selectedLocation) {
      setError('Please set a pickup address before placing your order.');
      return;
    }

    if (dealer.isOnline === false) {
      setError('This scrap dealer is currently offline (Off Duty) and not accepting new pickup orders.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const order = await createNewOrder({
        dealerId: dealer.dealerId,
        pickupAddress: selectedLocation.address,
        pickupCoordinates: selectedLocation.coordinates,
        selectedMaterials: selectedMaterials.map((m) => ({
          category: m.category,
          name: m.name,
          unit: m.unit,
          estimatedWeightKg: m.estimatedWeightKg,
        })),
        notes: notes || undefined,
      });

      try {
        sessionStorage.removeItem('kabadiwala_pending_dealer');
      } catch {}

      // Navigate to order screen
      navigate(`/order/${order.orderId}`, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to place scrap order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-24">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex items-center space-x-3 sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900">Review & Book Pickup</h1>
          <p className="text-[11px] text-slate-500">Fast doorstep scrap collection</p>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Selected Dealer Summary */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Selected Scrap Dealer
              </div>
              <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{dealer.businessName}</h2>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{dealer.distanceKm} km away</span>
                </span>
                <span>·</span>
                <span className="flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{dealer.vehicleType}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-amber-900 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{dealer.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Pickup Location Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Pickup Address ({selectedLocation?.label || 'Home'})
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                {selectedLocation?.address || 'No address set'}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/location')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex-shrink-0"
          >
            Change
          </button>
        </div>

        {/* Material Selection Widget */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <MaterialSelector
            availableRates={dealer.scrapRates}
            selectedMaterials={selectedMaterials}
            onChange={setSelectedMaterials}
          />
        </div>

        {/* Additional Notes input */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center space-x-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Instructions for Scrap Dealer (Optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Call before arrival / 3rd floor / Heavy iron gate"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition"
          />
        </div>

        {/* Guarantee Banner */}
        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-[11px] leading-snug">
            Free doorstep pickup guarantee · Certified digital scale weighing · Instant payment via Cash / UPI on site.
          </p>
        </div>

        {dealer.isOnline === false && (
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>This scrap dealer is currently offline (Off Duty) and not accepting new pickup orders.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Floating Bottom Booking Action */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-sheet">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Est. Scrap Earning
            </div>
            <div className="text-xl font-extrabold text-emerald-700">
              ₹
              {selectedMaterials.reduce((acc, m) => acc + m.calculatedAmount, 0)}
            </div>
          </div>

          <button
            onClick={handleCreateOrder}
            disabled={isSubmitting || selectedMaterials.length === 0 || dealer.isOnline === false}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-5 rounded-2xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
          >
            <span>
              {dealer.isOnline === false
                ? 'Dealer Offline'
                : isSubmitting
                ? 'Dispatching Request...'
                : 'Request Scrap Pickup'}
            </span>
            {dealer.isOnline !== false && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
