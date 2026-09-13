import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { OrderStatusBadge } from '../components/order/OrderStatusBadge';
import { OtpDisplayCard } from '../components/order/OtpDisplayCard';
import { LiveTrackingMap } from '../components/map/LiveTrackingMap';
import { Toast } from '../components/common/Toast';
import {
  ArrowLeft,
  Truck,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  MapPin,
  Scale,
  Sparkles,
  Share2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { getVehicleDetails } from '../utils/vehicleUtils';

export const ActiveOrderScreen: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const {
    activeOrder,
    fetchOrder,
    cancelOrder,
    dealerLiveLocation,
    submitRating,
  } = useOrder();

  const [order, setOrder] = useState(activeOrder);
  const [isCancelling, setIsCancelling] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['On Time', 'Accurate Weighing']);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const vehicleDetails = getVehicleDetails(order?.dealerSnapshot?.vehicleType);

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId).then((data) => {
        if (data) setOrder(data);
      });
    }
  }, [orderId, fetchOrder]);

  useEffect(() => {
    if (activeOrder && activeOrder.orderId === orderId) {
      setOrder(activeOrder);
    }
  }, [activeOrder, orderId]);

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center shadow-2xl">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-3">Loading order details...</p>
      </div>
    );
  }

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this scrap pickup request?')) {
      setIsCancelling(true);
      try {
        const updated = await cancelOrder(order.orderId, 'Cancelled by consumer');
        setOrder(updated);
      } catch (err: any) {
        alert(err.message || 'Failed to cancel order');
      } finally {
        setIsCancelling(false);
      }
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRating(true);
    try {
      await submitRating(order.orderId, ratingScore, ratingFeedback, selectedTags);
      setRatingSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const ratingTagOptions = [
    'On Time',
    'Accurate Weighing',
    'Polite Behaviour',
    'Clean Vehicle',
    'Instant Payment',
    'Best Scrap Rates',
  ];

  return (
    <div className="min-h-screen bg-slate-100 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-16 relative">
      <Toast />

      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-extrabold text-slate-900">Pickup #{order.orderId}</h1>
            </div>
            <p className="text-[10px] text-slate-400">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Live State
            </p>
          </div>
        </div>

        <OrderStatusBadge status={order.status} size="sm" />
      </div>

      {/* Dynamic Content by State */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* ================= STATE 1: PENDING (Searching/Waiting) ================= */}
        {order.status === 'PENDING' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-4 shadow-card">
              {/* Radar Wave Animation */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
                <div className="absolute inset-2 rounded-full bg-emerald-500/30 animate-pulse"></div>
                <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg relative z-10">
                  <Truck className="w-7 h-7" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">Waiting for Dealer to Accept...</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Alerting <strong className="text-slate-800">{order.dealerSnapshot?.businessName}</strong>.
                  They will confirm your pickup slot shortly.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Estimated Pickup Value:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  ₹{order.estimatedTotalAmount}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 py-2.5 px-4 rounded-xl transition w-full"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Request'}
              </button>
            </div>
          </div>
        )}

        {/* ================= STATE 2 & 3: ACCEPTED & DEALER_EN_ROUTE (Live Tracking) ================= */}
        {['ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED', 'OTP_PENDING'].includes(order.status) && (
          <div className="space-y-4">
            {/* Live Interactive Map */}
            <LiveTrackingMap
              pickupCoords={order.pickupLocation?.coordinates || [77.5020, 13.0450]}
              dealerLocation={dealerLiveLocation || order.dealerLiveLocation}
              pickupAddress={order.pickupAddress}
              dealerName={order.dealerSnapshot?.businessName || 'Scrap Collector Partner'}
              dealerVehicle={order.dealerSnapshot?.vehicleType || 'Electric Mini Loader'}
            />

            {/* OTP Display Card */}
            <OtpDisplayCard otpCode={order.otp?.code || '----'} isVerified={order.otp?.isVerified || false} />

            {/* Dealer Contact Card */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${vehicleDetails.bgGradient} text-white flex items-center justify-center font-black text-lg border-2 border-white shadow-md ring-2 ${vehicleDetails.ringColor}`}
                    dangerouslySetInnerHTML={{ __html: vehicleDetails.svgHtml }}
                  />
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">
                        {order.dealerSnapshot?.businessName || 'Scrap Collector Partner'}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vehicleDetails.tagColor}`}>
                        {vehicleDetails.emoji} {vehicleDetails.category.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Driver: {order.dealerSnapshot?.contactPerson || 'Assigned Driver'}
                      {order.dealerSnapshot?.vehicleNumber ? ` · ${order.dealerSnapshot.vehicleNumber}` : ''}
                    </p>
                    <p className="text-[11px] font-medium text-emerald-700">
                      Vehicle: {order.dealerSnapshot?.vehicleType || vehicleDetails.name}
                    </p>
                  </div>
                </div>

                <a
                  href={order.dealerSnapshot?.phone ? `tel:${order.dealerSnapshot.phone}` : '#'}
                  className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition shadow-xs"
                  title="Call Scrap Dealer"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Cancel Button if still en route */}
            {['ACCEPTED', 'DEALER_EN_ROUTE'].includes(order.status) && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 py-2 w-full text-center transition"
              >
                {isCancelling ? 'Cancelling...' : 'Need to cancel this pickup?'}
              </button>
            )}
          </div>
        )}

        {/* ================= STATE 4: OTP_VERIFIED (Weighing in Progress) ================= */}
        {order.status === 'OTP_VERIFIED' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-teal-200 text-center space-y-4 shadow-card">
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto shadow-inner">
                <Scale className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">Pickup Verified & In Progress</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Dealer is weighing your scrap on a certified digital scale.
                </p>
              </div>

              <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl text-xs text-teal-900 space-y-1 text-left">
                <div className="font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Doorstep Inspection</span>
                </div>
                <p className="text-[11px] text-teal-800 leading-tight">
                  You will receive the final verified receipt and payout directly from the dealer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= STATE 5: COMPLETED (Receipt & Rating) ================= */}
        {order.status === 'COMPLETED' && (
          <div className="space-y-4">
            {/* Completion Receipt */}
            <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-card text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Scrap Collected Successfully
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1.5">Pickup Completed!</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Amount paid via Cash / UPI by {order.dealerSnapshot?.businessName}
                </p>
              </div>

              {/* Amount Box */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div className="text-left">
                  <div className="text-xs text-slate-400">Total Scrap Amount Earned</div>
                  <div className="text-[11px] text-emerald-400">Settled on digital scale</div>
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  ₹{order.finalTotalAmount || order.estimatedTotalAmount}
                </div>
              </div>

              {/* Weight Breakdown */}
              <div className="text-left space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800">Scrap Weight Breakdown:</div>
                <div className="space-y-1.5">
                  {(order.finalWeights && order.finalWeights.length > 0
                    ? order.finalWeights
                    : order.selectedMaterials
                  ).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 rounded-xl"
                    >
                      <span className="font-semibold text-slate-700">{item.name}</span>
                      <span className="text-slate-500">
                        {item.actualWeightKg || item.estimatedWeightKg} {item.unit} @ ₹{item.pricePerKg}/{item.unit} ={' '}
                        <strong className="text-slate-900">
                          ₹{item.finalAmount || item.calculatedAmount}
                        </strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rating Section */}
            {!order.rated && !ratingSubmitted ? (
              <form
                onSubmit={handleRatingSubmit}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-4"
              >
                <div className="text-center">
                  <h3 className="text-base font-bold text-slate-900">Rate your experience</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    How was your service with {order.dealerSnapshot?.businessName}?
                  </p>
                </div>

                {/* Stars */}
                <div className="flex justify-center space-x-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingScore(star)}
                      className="p-1.5 focus:outline-none transition transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= ratingScore
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Feedback Tags */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {ratingTagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                        selectedTags.includes(tag)
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Comment box */}
                <input
                  type="text"
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="Leave an optional comment (e.g. Accurate scale)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition"
                />

                <button
                  type="submit"
                  disabled={isSubmittingRating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmittingRating ? 'Submitting...' : 'Submit Rating'}</span>
                </button>
              </form>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-3xl text-center space-y-1">
                <div className="flex items-center justify-center space-x-1 text-amber-500">
                  <Star className="w-5 h-5 fill-amber-400" />
                  <Star className="w-5 h-5 fill-amber-400" />
                  <Star className="w-5 h-5 fill-amber-400" />
                  <Star className="w-5 h-5 fill-amber-400" />
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div className="text-xs font-bold text-emerald-900">Rating Submitted</div>
                <p className="text-[11px] text-emerald-700">Thank you for helping keep scrap prices fair!</p>
              </div>
            )}
          </div>
        )}

        {/* ================= STATE 6: CANCELLED or REJECTED ================= */}
        {['CANCELLED', 'REJECTED'].includes(order.status) && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-3 shadow-card">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-base font-black text-slate-900">
              {order.status === 'CANCELLED' ? 'Order Cancelled' : 'Pickup Request Declined'}
            </h2>
            <p className="text-xs text-slate-500">
              {order.cancellationReason || 'You can place a new pickup request with other nearby dealers.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition"
            >
              Browse Nearby Dealers
            </button>
          </div>
        )}

        {/* Selected Materials Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-2">
          <div className="text-xs font-bold text-slate-800">Scrap Items Booked</div>
          <div className="divide-y divide-slate-100">
            {order.selectedMaterials.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{item.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Est. {item.estimatedWeightKg} {item.unit} @ ₹{item.pricePerKg}/{item.unit}
                  </div>
                </div>
                <div className="font-extrabold text-slate-900">₹{item.calculatedAmount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pickup Address Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-1">
          <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pickup Address</span>
          </div>
          <p className="text-xs text-slate-600">{order.pickupAddress}</p>
        </div>
      </div>
    </div>
  );
};
