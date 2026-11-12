import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { storeService } from '../services/storeService';
import { RecycledProduct, RecycledCategory, RecyclerProfile } from '../types';
import { AppHeader } from '../components/layout/AppHeader';
import { ProductDetailsModal } from '../components/store/ProductDetailsModal';
import {
  Search,
  Coins,
  Sparkles,
  ShoppingBag,
  Building2,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Star,
  MapPin,
  RefreshCw,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  Store,
  Tag,
} from 'lucide-react';

const CATEGORIES: Array<{ id: RecycledCategory | 'ALL'; label: string; icon: string }> = [
  { id: 'ALL', label: 'All Categories', icon: '♻️' },
  { id: 'Furniture', label: 'Furniture', icon: '🛋️' },
  { id: 'Chairs & Tables', label: 'Chairs & Tables', icon: '🪑' },
  { id: 'Home & Kitchen', label: 'Home & Kitchen', icon: '🍽️' },
  { id: 'Garden Products', label: 'Garden Products', icon: '🪴' },
  { id: 'Dustbins', label: 'Dustbins', icon: '🗑️' },
  { id: 'Home Decor', label: 'Home Decor', icon: '🏺' },
  { id: 'Bags & Accessories', label: 'Bags & Accessories', icon: '🎒' },
  { id: 'Other Recycled Products', label: 'Other Products', icon: '📦' },
];

export const RecycledStoreScreen: React.FC = () => {
  const navigate = useNavigate();
  const { availableCoins } = useWallet();

  const [recyclers, setRecyclers] = useState<RecyclerProfile[]>([]);
  const [selectedRecyclerId, setSelectedRecyclerId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<RecycledCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProductForModal, setSelectedProductForModal] = useState<RecycledProduct | null>(null);

  const searchDebounceRef = useRef<any>(null);

  const fetchRecyclers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await storeService.getRecyclers({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        search: searchQuery.trim() || undefined,
      });

      setRecyclers(data || []);
    } catch (err: any) {
      console.error('Failed to fetch recyclers and products:', err);
      setError('Failed to load recyclers and products. Please check connection and retry.');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchRecyclers();
  }, [fetchRecyclers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIsSearching(true);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, 350);
  };

  const selectedRecycler =
    selectedRecyclerId !== 'ALL'
      ? recyclers.find((r) => r.recyclerId === selectedRecyclerId) || null
      : null;

  const totalProductsCount = recyclers.reduce((acc, r) => acc + (r.productCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* App Header */}
      <AppHeader title="Recycled Store" showBack={false} />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Top Rewards Wallet Balance Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-4 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md text-amber-300 flex items-center justify-center flex-shrink-0">
              <Coins className="w-6 h-6 fill-amber-300" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                Your Rewards Wallet
              </div>
              <div className="text-lg font-black text-white flex items-center space-x-1.5">
                <span>Available Balance:</span>
                <span className="text-amber-300 drop-shadow-xs">{availableCoins} Coins</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/wallet')}
            className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition flex items-center space-x-1"
          >
            <span>Wallet</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products or recyclers..."
            defaultValue={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs text-slate-800 placeholder-slate-400"
          />
          {isSearching && (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Category Pills (Horizontal Scroll) */}
        <div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 flex-shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recyclers Selector Strip */}
        {recyclers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Certified Recyclers ({recyclers.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">Select recycler</span>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {/* All Recyclers Tab */}
              <button
                onClick={() => setSelectedRecyclerId('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-2 flex-shrink-0 border ${
                  selectedRecyclerId === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>All Recyclers</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {totalProductsCount}
                </span>
              </button>

              {/* Individual Recycler Pills */}
              {recyclers.map((r) => {
                const isSelected = selectedRecyclerId === r.recyclerId;
                return (
                  <button
                    key={r.recyclerId}
                    onClick={() => setSelectedRecyclerId(r.recyclerId)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-2 flex-shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {r.recyclerName?.charAt(0) || 'R'}
                    </div>
                    <span className="max-w-[120px] truncate">{r.recyclerName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.productCount || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                    <div className="h-2.5 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="h-44 bg-slate-200 rounded-xl" />
                  <div className="h-44 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-xs text-red-700 font-semibold">{error}</p>
            <button
              onClick={() => fetchRecyclers()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : selectedRecycler ? (
          /* SINGLE RECYCLER STOREFRONT VIEW */
          <div className="space-y-4">
            {/* Recycler Profile Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedRecyclerId('ALL')}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>All Recyclers</span>
                </button>
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Certified Recycler</span>
                </span>
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg flex-shrink-0 shadow-md">
                  {selectedRecycler.recyclerName?.charAt(0) || 'R'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-900 truncate">
                    {selectedRecycler.recyclerName}
                  </h2>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 mr-0.5 text-amber-400" />
                      {selectedRecycler.rating || 4.9}
                    </span>
                    <span>·</span>
                    <span className="truncate flex items-center">
                      <MapPin className="w-3 h-3 text-slate-400 mr-0.5" />
                      {selectedRecycler.address || selectedRecycler.city || 'Service Hub'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Available Listed Items:</span>
                <span className="font-bold text-emerald-700">
                  {selectedRecycler.products.length} Products
                </span>
              </div>
            </div>

            {/* Products of this specific Recycler */}
            {selectedRecycler.products.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">No active products listed</p>
                <p className="text-xs text-slate-500">
                  This recycler has not listed any upcycled products in this category yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {selectedRecycler.products.map((prod) => (
                  <ProductCard
                    key={prod.productId}
                    product={prod}
                    onOpenModal={() => setSelectedProductForModal(prod)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : recyclers.length === 0 || totalProductsCount === 0 ? (
          /* Empty Marketplace State */
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">No Recycled Products Listed Yet</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              When registered recyclers on Scrapwala list upcycled products through their partner dashboard,
              they will automatically appear here with their prices and details.
            </p>
            {recyclers.length > 0 && (
              <div className="pt-2 text-left bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <div className="font-bold text-slate-700 mb-1">Registered Platform Recyclers:</div>
                <ul className="space-y-1 text-slate-600">
                  {recyclers.map((r) => (
                    <li key={r.recyclerId} className="flex items-center space-x-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="font-medium">{r.recyclerName}</span>
                      <span className="text-[10px] text-slate-400">({r.address || r.city})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* ALL RECYCLERS VIEW: Grouped by Recycler */
          <div className="space-y-6">
            {recyclers
              .filter((r) => r.productCount > 0)
              .map((recycler) => (
                <div
                  key={recycler.recyclerId}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  {/* Recycler Header: Clearly shows who the recycler is */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-xs">
                        {recycler.recyclerName?.charAt(0) || 'R'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h3
                            onClick={() => setSelectedRecyclerId(recycler.recyclerId)}
                            className="text-xs font-black text-slate-900 truncate hover:text-emerald-700 cursor-pointer"
                          >
                            {recycler.recyclerName}
                          </h3>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                          <span className="flex items-center text-amber-600 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 mr-0.5 text-amber-400" />
                            {recycler.rating || 4.9}
                          </span>
                          <span>·</span>
                          <span className="truncate">
                            {recycler.address || recycler.city || 'Service Hub'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedRecyclerId(recycler.recyclerId)}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition flex items-center space-x-1 flex-shrink-0"
                    >
                      <span>Store</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Products Grid for this Recycler */}
                  <div className="grid grid-cols-2 gap-3">
                    {recycler.products.map((prod) => (
                      <ProductCard
                        key={prod.productId}
                        product={prod}
                        onOpenModal={() => setSelectedProductForModal(prod)}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* Product Details & Purchase Modal */}
      {selectedProductForModal && (
        <ProductDetailsModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
          onPurchaseSuccess={() => {
            fetchRecyclers();
          }}
        />
      )}
    </div>
  );
};

interface ProductCardProps {
  product: RecycledProduct;
  onOpenModal: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenModal }) => {
  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between">
      <div className="relative">
        {/* Product Image */}
        <div
          onClick={onOpenModal}
          className="h-36 w-full bg-slate-200 overflow-hidden cursor-pointer"
        >
          <img
            src={product.images[0] || 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80'}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition duration-300"
            loading="lazy"
          />
        </div>

        {/* Stock status badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
              product.stock > 5
                ? 'bg-emerald-600/90 text-white'
                : product.stock > 0
                ? 'bg-amber-600/90 text-white'
                : 'bg-red-600/90 text-white'
            }`}
          >
            {product.stock > 5 ? 'In Stock' : product.stock > 0 ? `${product.stock} left` : 'Out of stock'}
          </span>
        </div>

        {/* Reward Coins discount badge */}
        {product.maxRewardCoins > 0 && (
          <div className="absolute bottom-2 right-2">
            <span className="text-[10px] font-black bg-white/95 text-amber-700 border border-amber-300/80 px-2 py-0.5 rounded-lg shadow-xs flex items-center space-x-1">
              <Coins className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>-₹{product.maxRewardCoins}</span>
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <span className="inline-block text-[9px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded uppercase tracking-wider mb-1">
            {product.category}
          </span>
          <h4
            onClick={onOpenModal}
            className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-emerald-700 cursor-pointer transition leading-tight"
          >
            {product.name}
          </h4>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-200/60">
          {/* Price display */}
          <div className="flex items-baseline space-x-1.5">
            <span className="text-sm font-black text-emerald-700">
              ₹{product.discountedPrice}
            </span>
            {product.originalPrice > product.discountedPrice && (
              <span className="text-[10px] text-slate-400 line-through font-medium">
                ₹{product.originalPrice}
              </span>
            )}
          </div>

          {/* Buy Now Button */}
          <button
            onClick={onOpenModal}
            className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs active:scale-95 flex items-center justify-center space-x-1"
          >
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
