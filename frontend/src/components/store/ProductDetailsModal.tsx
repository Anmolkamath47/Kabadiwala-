import React, { useState } from 'react';
import { RecycledProduct } from '../../types';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { storeService } from '../../services/storeService';
import {
  X,
  Coins,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Package,
  MapPin,
  Star,
  Sparkles,
  Info,
  CreditCard,
  Building2,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface ProductDetailsModalProps {
  product: RecycledProduct | null;
  onClose: () => void;
  onPurchaseSuccess?: (order: any) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  onClose,
  onPurchaseSuccess,
}) => {
  const { availableCoins, refreshWallet } = useWallet();
  const { user, selectedLocation } = useAuth();

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [coinsToApply, setCoinsToApply] = useState<number>(0);
  const [isCheckoutStep, setIsCheckoutStep] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash on Delivery');
  const [recipientName, setRecipientName] = useState<string>(user?.name || 'Scrapwala Consumer');
  const [recipientPhone, setRecipientPhone] = useState<string>(user?.phone || '+91 98765 43210');
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    selectedLocation?.address || (user?.savedLocations?.[0]?.address || 'House 42, Green Park Main, New Delhi')
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [purchaseSuccessOrder, setPurchaseSuccessOrder] = useState<any | null>(null);

  if (!product) return null;

  // Max coins allowable: min of product maxRewardCoins, discounted price, and available user coins
  const maxPossibleCoins = Math.min(
    product.maxRewardCoins || 0,
    product.discountedPrice,
    availableCoins
  );

  const effectiveCoinsRedeemed = Math.min(coinsToApply, maxPossibleCoins);
  const finalPrice = Math.max(0, product.discountedPrice - effectiveCoinsRedeemed);

  const handleApplyMaxCoins = () => {
    setCoinsToApply(maxPossibleCoins);
  };

  const handleClearCoins = () => {
    setCoinsToApply(0);
  };

  const handleConfirmPurchase = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await storeService.purchaseProduct({
        productId: product.productId,
        coinsToRedeem: effectiveCoinsRedeemed,
        quantity: 1,
        paymentMethod,
        shippingAddress: {
          name: recipientName.trim(),
          phone: recipientPhone.trim(),
          address: deliveryAddress.trim(),
        },
      });

      // Refresh wallet balance in background
      await refreshWallet();

      setPurchaseSuccessOrder(result);
      if (onPurchaseSuccess) {
        onPurchaseSuccess(result);
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setErrorMessage(
        err?.response?.data?.message || err.message || 'Failed to place order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Sticky Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {purchaseSuccessOrder ? (
          /* Order Confirmation Screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
                Order Placed Successfully!
              </span>
              <h3 className="text-xl font-black text-slate-900">{product.name}</h3>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Order ID: {purchaseSuccessOrder.order?.orderId}
              </p>
            </div>

            {/* Price breakdown summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between text-slate-600">
                <span>Product Price:</span>
                <span className="font-bold">₹{product.discountedPrice}</span>
              </div>
              {purchaseSuccessOrder.coinsRedeemed > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Reward Coins Redeemed:</span>
                  <span>-{purchaseSuccessOrder.coinsRedeemed} Coins (-₹{purchaseSuccessOrder.discountAmount})</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-700">₹{purchaseSuccessOrder.finalPricePaid}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                <span>Payment Mode:</span>
                <span>{purchaseSuccessOrder.order?.paymentMethod || paymentMethod}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 flex items-center space-x-2 text-left">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Your remaining wallet balance is now <strong>{purchaseSuccessOrder.remainingCoins} Coins</strong>.
              </span>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={onClose}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : !isCheckoutStep ? (
          /* Product Details View */
          <div>
            {/* Multiple Images Carousel */}
            <div className="relative bg-slate-100 h-64 sm:h-72 w-full overflow-hidden rounded-t-3xl">
              <img
                src={product.images[activeImageIndex] || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover transition duration-300"
              />

              {/* Stock Status Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md ${
                    product.stock > 5
                      ? 'bg-emerald-600 text-white'
                      : product.stock > 0
                      ? 'bg-amber-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {product.stock > 5
                    ? `In Stock (${product.stock} available)`
                    : product.stock > 0
                    ? `Only ${product.stock} left!`
                    : 'Out of Stock'}
                </span>
              </div>

              {/* Prev / Next Image arrows if multiple */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) =>
                        prev === 0 ? product.images.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) =>
                        prev === product.images.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail selector */}
            {product.images.length > 1 && (
              <div className="flex items-center space-x-2 px-6 pt-3 overflow-x-auto">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition ${
                      activeImageIndex === idx
                        ? 'border-emerald-600 ring-2 ring-emerald-200'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Content Details */}
            <div className="p-6 space-y-5">
              {/* Recycler Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">{product.recyclerName}</span>
                  <span title="Verified Scrapwala Recycler">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </span>
                </div>
                {product.recyclerLocation?.city && (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center">
                    <MapPin className="w-3 h-3 mr-0.5 text-slate-400" />
                    {product.recyclerLocation.city}
                  </span>
                )}
              </div>

              {/* Product Title & Category */}
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  {product.category}
                </span>
                <h2 className="text-xl font-black text-slate-900 leading-snug">{product.name}</h2>
              </div>

              {/* Price & Coins Section */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-black text-emerald-700">
                    ₹{product.discountedPrice}
                  </span>
                  {product.originalPrice > product.discountedPrice && (
                    <span className="text-base text-slate-400 line-through font-semibold">
                      ₹{product.originalPrice}
                    </span>
                  )}
                  {product.originalPrice > product.discountedPrice && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      Save ₹{product.originalPrice - product.discountedPrice}
                    </span>
                  )}
                </div>

                {/* Reward Discount Opportunity */}
                {product.maxRewardCoins > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-amber-800">
                      <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-bold">
                        Up to {product.maxRewardCoins} Coins Discount Available
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Your Bal: <strong>{availableCoins}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  About this Recycled Item
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">{product.description}</p>
              </div>

              {/* Specifications */}
              {product.specifications && product.specifications.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Specifications
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {product.specifications.map((spec, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 flex items-start justify-between"
                      >
                        <span className="text-slate-500 font-medium">{spec.key}</span>
                        <span className="text-slate-900 font-bold text-right ml-2">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  onClick={() => setIsCheckoutStep(true)}
                  disabled={product.stock <= 0}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 ${
                    product.stock > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>{product.stock > 0 ? 'Buy Now with Coins' : 'Out of Stock'}</span>
                  {product.stock > 0 && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Checkout & Coin Redemption Step */
          <div className="p-6 space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <button
                onClick={() => setIsCheckoutStep(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-base text-slate-900">Checkout & Coin Redemption</h3>
                <p className="text-xs text-slate-500">Apply rewards & confirm order</p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {errorMessage}
              </div>
            )}

            {/* Product Summary */}
            <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{product.name}</h4>
                <p className="text-[11px] text-slate-500">{product.recyclerName}</p>
                <div className="text-xs font-black text-emerald-700 mt-0.5">
                  Price: ₹{product.discountedPrice}
                </div>
              </div>
            </div>

            {/* Rewards Wallet Integration Box */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-900">
                  <Coins className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-xs">Redeem Scrap Reward Coins</span>
                </div>
                <span className="text-xs font-bold text-emerald-800">
                  Available: {availableCoins} Coins
                </span>
              </div>

              {availableCoins > 0 && maxPossibleCoins > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span>Coins to Apply:</span>
                    <div className="space-x-2">
                      <button
                        onClick={handleClearCoins}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
                      >
                        Reset (0)
                      </button>
                      <button
                        onClick={handleApplyMaxCoins}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        Apply Max ({maxPossibleCoins})
                      </button>
                    </div>
                  </div>

                  {/* Slider to adjust coins */}
                  <input
                    type="range"
                    min={0}
                    max={maxPossibleCoins}
                    step={1}
                    value={effectiveCoinsRedeemed}
                    onChange={(e) => setCoinsToApply(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />

                  <div className="flex justify-between items-center text-xs font-bold pt-1">
                    <span className="text-slate-600">Selected Discount:</span>
                    <span className="text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md">
                      {effectiveCoinsRedeemed} Coins applied (-₹{effectiveCoinsRedeemed})
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {availableCoins === 0
                    ? 'No reward coins available in your wallet. Complete scrap pickups to earn 10% coins!'
                    : 'Maximum coin limit reached for this product.'}
                </p>
              )}
            </div>

            {/* Delivery Details Form */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Delivery Details
              </h4>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Recipient Name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <textarea
                  rows={2}
                  placeholder="Full Delivery Address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment Method
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {['Cash on Delivery', 'UPI / Online'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      paymentMethod === method
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Calculation Summary as in prompt example */}
            {/* Example: Product Price: ₹800, Coins Redeemed: 150, Final Price: ₹650 */}
            <div className="bg-slate-100/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Product Price:</span>
                <span className="font-bold">₹{product.discountedPrice}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Coins Redeemed:</span>
                <span>{effectiveCoinsRedeemed} Coins (-₹{effectiveCoinsRedeemed})</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                <span>Final Price:</span>
                <span className="text-emerald-700">₹{finalPrice}</span>
              </div>
            </div>

            {/* Confirm Purchase Button */}
            <button
              onClick={handleConfirmPurchase}
              disabled={isSubmitting || !recipientName.trim() || !deliveryAddress.trim()}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center space-x-2 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <span>Confirm Purchase (Pay ₹{finalPrice})</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
