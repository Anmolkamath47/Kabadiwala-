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
  RefreshCw,
  MessageSquare,
  X,
  Send,
  ExternalLink,
  ChevronRight,
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

  // Live Tracking state matching reference layout
  const [etaMins, setEtaMins] = useState<number>(7);
  const [isRefreshingTracking, setIsRefreshingTracking] = useState<boolean>(false);
  const [showMessageBanner, setShowMessageBanner] = useState<boolean>(true);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>(
    order?.dealerSnapshot?.vehicleType || 'Tata Ace Mini Truck'
  );
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'dealer' | 'consumer'; text: string; time: string }>>([
    {
      sender: 'dealer',
      text: 'Hello! I am on the way with a certified digital scale. Please keep your scrap ready at the doorstep.',
      time: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  const activeVehicleDetails = getVehicleDetails(selectedVehicleType || order?.dealerSnapshot?.vehicleType);

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

  const isLiveTracking = ['ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED', 'OTP_PENDING'].includes(order.status);

  const handleRefreshTracking = () => {
    setIsRefreshingTracking(true);
    fetchOrder(order.orderId);
    setTimeout(() => {
      setIsRefreshingTracking(false);
    }, 800);
  };

  const handleShareTracking = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Scrapwala Live Tracking',
        text: `Track scrap pickup #${order.orderId} live!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Tracking link copied to clipboard!');
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const txt = (textToSend || chatInput).trim();
    if (!txt) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'consumer',
        text: txt,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'dealer',
          text: `Got it! Reaching your doorstep in approx ${etaMins} mins.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1200);
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
      {isLiveTracking ? (
        <div className="bg-[#24963f] text-white px-4 pt-3 pb-4 shadow-md sticky top-0 z-30 select-none">
          {/* Top Bar with back, title, share */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center transition active:scale-95 text-white cursor-pointer"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>

            <div className="text-center truncate px-2 max-w-[220px]">
              <span className="text-xs font-semibold text-white/95 truncate block">
                {order.dealerSnapshot?.businessName || 'Flying Aromas'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleShareTracking}
              className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center transition active:scale-95 text-white cursor-pointer"
              title="Share Tracking"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Headline: Order is on the way 🤘 */}
          <div className="text-center mt-2.5">
            <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-white flex items-center justify-center space-x-2">
              <span>Order is on the way</span>
              <span className="text-2xl">🤘</span>
            </h1>

            {/* Arriving in X mins badge with refresh */}
            <div className="mt-2.5 inline-flex items-center space-x-2 bg-black/20 hover:bg-black/30 backdrop-blur-xs px-4 py-1.5 rounded-full border border-white/15 text-xs font-semibold shadow-inner">
              <span>Arriving in {etaMins} mins</span>
              <button
                type="button"
                onClick={handleRefreshTracking}
                className={`p-0.5 text-white/90 hover:text-white transition active:scale-90 cursor-pointer ${
                  isRefreshingTracking ? 'animate-spin' : ''
                }`}
                title="Refresh ETA & Location"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Message Prompt Banner (Zomato style) */}
      {isLiveTracking && showMessageBanner && (
        <div className="bg-white px-4 py-2.5 border-b border-slate-200 shadow-xs flex items-center justify-between z-20">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 border border-slate-200">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-700 truncate">
              You have <strong className="text-slate-900 font-bold">1 new message</strong> from the delivery partner
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="text-xs font-black text-[#dc2626] hover:text-rose-700 tracking-wide uppercase px-1 transition cursor-pointer"
            >
              CHAT NOW
            </button>
            <button
              type="button"
              onClick={() => setShowMessageBanner(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Vehicle Model Selector Bar for instant testing of all 3 vehicles */}
      {isLiveTracking && (
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs overflow-x-auto select-none">
          <span className="text-slate-500 font-bold flex-shrink-0 mr-2 text-[11px]">Dealer Vehicle on Road:</span>
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {[
              { id: 'bike', label: '🛵 Bike', value: 'Delivery Scooter / Bike' },
              { id: 'truck', label: '🛻 Pickup Truck', value: 'Tata Ace Mini Truck' },
              { id: 'auto', label: '🛺 3-Wheeler', value: '3-Wheeler Auto Loader' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicleType(v.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  activeVehicleDetails.category === v.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
              dealerVehicle={selectedVehicleType || order.dealerSnapshot?.vehicleType || 'Tata Ace Mini Truck'}
              onEtaUpdate={(mins) => setEtaMins(mins)}
              onCouponClick={() => alert('Special ₹50 scrap bonus voucher applied to your payout!')}
              className="h-[360px] sm:h-[400px]"
            />

            {/* Promo Card matching Zomato Screenshot */}
            <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-card flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-rose-400 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 truncate">Make your next scrap pickup special 😍</h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Iconic rates from faraway places delivered to your doorstep!
                  </p>
                  <div className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center mt-0.5 cursor-pointer">
                    <span>Order from Scrapwala Specials</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dealer / Driver Profile Card matching Zomato Screenshot */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-md">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                        alt="Partner"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs"></span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">
                      {order.dealerSnapshot?.contactPerson || 'Chandan Kumar Rajbhar'}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      100+ five-star scrap pickups · {activeVehicleDetails.badge}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className="relative w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer shadow-xs"
                    title="Chat with Scrap Partner"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-600" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white"></span>
                  </button>

                  <a
                    href={order.dealerSnapshot?.phone ? `tel:${order.dealerSnapshot.phone}` : '#'}
                    className="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 transition shadow-xs cursor-pointer"
                    title="Call Scrap Partner"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Thank Driver / Tipping Card matching Zomato Screenshot */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-2.5">
              <div>
                <h4 className="text-xs font-black text-slate-900">
                  Thank {(order.dealerSnapshot?.contactPerson || 'Chandan').split(' ')[0]} by leaving a tip
                </h4>
                <p className="text-[11px] text-slate-500">100% of the tip will go to your scrap pickup partner</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[20, 30, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSelectedTip(selectedTip === amt ? null : amt)}
                    className={`py-2 px-1 rounded-2xl text-xs font-black transition border cursor-pointer ${
                      selectedTip === amt
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              {selectedTip && (
                <p className="text-[11px] text-emerald-700 font-bold text-center">
                  ₹{selectedTip} tip will be credited to partner upon doorstep completion!
                </p>
              )}
            </div>

            {/* Doorstep Verification OTP Card (100% Intact) */}
            <OtpDisplayCard otpCode={order.otp?.code || '----'} isVerified={order.otp?.isVerified || false} />

            {/* Cancel Button if still en route */}
            {['ACCEPTED', 'DEALER_EN_ROUTE'].includes(order.status) && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 py-2 w-full text-center transition cursor-pointer"
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

      {/* Quick In-App Chat Modal with Scrap Dealer */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200">
            {/* Chat Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                      alt="Dealer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900"></span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {order.dealerSnapshot?.contactPerson || 'Chandan Kumar'}
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-semibold truncate">Scrap Dealer Partner · Active</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                {order.dealerSnapshot?.phone && (
                  <a
                    href={`https://wa.me/91${order.dealerSnapshot.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition text-xs font-bold shadow-xs"
                    title="Open WhatsApp"
                  >
                    WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Message List */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-slate-50 min-h-[220px]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'consumer' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      msg.sender === 'consumer'
                        ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Quick Response Chips */}
            <div className="p-2.5 bg-white border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px] select-none">
              {[
                'Where have you reached?',
                'I am at the entrance gate',
                'Please call when nearby',
                'Scrap is packed & ready',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium whitespace-nowrap cursor-pointer transition active:scale-95 border border-slate-200"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message to dealer..."
                className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-3.5 py-2 text-xs text-slate-800 outline-hidden focus:border-emerald-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
