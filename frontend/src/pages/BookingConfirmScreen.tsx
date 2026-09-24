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
  Camera,
  Trash2,
  ZoomIn,
  CheckCircle2,
  X,
} from 'lucide-react';

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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

  const [scrapPhoto, setScrapPhoto] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setPhotoError(null);
    try {
      const compressedDataUrl = await compressImage(file);
      setScrapPhoto(compressedDataUrl);
      setError(null);
    } catch (err: any) {
      console.error('Error processing scrap photo:', err);
      setPhotoError('Failed to process image. Please try again.');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setScrapPhoto(null);
    setPhotoError(null);
  };


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

    if (!scrapPhoto) {
      setError('Please upload or capture a photo of your scrap before booking.');
      setPhotoError('Scrap photo is required so the dealer can inspect before accepting.');
      return;
    }

    setError(null);
    setPhotoError(null);
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
        scrapPhoto,
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

        {/* Scrap Photo Upload Card (Required for Dealer) */}
        <div
          id="scrap-photo-upload-section"
          className={`bg-white p-4 rounded-2xl border transition shadow-card space-y-3 ${
            photoError ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                Photo of Scrap <span className="text-rose-500">*</span>
              </span>
            </div>
            {scrapPhoto ? (
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Photo Ready</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                Required for Dealer
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            Please capture a photo of your scrap pile using your camera. The dealer gets this same photo in their incoming notification to inspect and accept.
          </p>

          {scrapPhoto ? (
            <div className="space-y-2">
              <div
                onClick={() => setShowPreviewModal(true)}
                className="relative h-44 rounded-xl overflow-hidden cursor-pointer group bg-slate-900 border border-slate-200 shadow-xs"
                title="Tap to preview full photo"
              >
                <img
                  src={scrapPhoto}
                  alt="Scrap Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition flex items-center justify-center">
                  <span className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition shadow-md">
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tap to View Full Photo</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Retake Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-emerald-400 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 flex flex-col items-center justify-center space-y-2 text-center cursor-pointer transition group shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-emerald-950 block">Take Photo from Camera</span>
                  <span className="text-xs text-emerald-700 font-medium mt-0.5 block">Tap to open camera and capture scrap</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {isProcessingPhoto && (
            <div className="flex items-center space-x-2 text-xs text-emerald-700 font-medium pt-1">
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Optimizing scrap photo for dealer notification...</span>
            </div>
          )}

          {photoError && (
            <p className="text-[11px] text-rose-600 font-semibold pt-1">
              {photoError}
            </p>
          )}
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

      {/* Full Photo Preview Lightbox Modal */}
      {showPreviewModal && scrapPhoto && (
        <div
          onClick={() => setShowPreviewModal(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative"
          >
            <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2 text-xs font-bold">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Your Scrap Photo (Sent to Dealer)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative max-h-[70vh] overflow-hidden bg-black flex items-center justify-center">
              <img
                src={scrapPhoto}
                alt="Full Scrap Preview"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-3 bg-slate-800 text-slate-300 text-xs flex items-center justify-between">
              <span>Ready for booking</span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
