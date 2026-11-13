import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { OrderStatusBadge } from '../components/order/OrderStatusBadge';
import {
  Clock,
  Truck,
  Calendar,
  IndianRupee,
  ChevronRight,
  PackageX,
  Star,
} from 'lucide-react';

export const OrderHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { orders, fetchOrdersHistory, isLoading } = useOrder();

  useEffect(() => {
    fetchOrdersHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-20">
      <AppHeader title="Order History" showBack={false} />

      <main className="p-4 space-y-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-extrabold text-slate-900">Your Scrap Pickups</h2>
          <span className="text-xs text-slate-500 font-semibold">{orders.length} orders</span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500">Loading order history...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3 shadow-2xs mt-4">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <PackageX className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No scrap orders yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              When you sell scrap, your orders, digital weighing receipts, and earnings will appear here.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-2xl text-xs transition"
            >
              Sell Scrap Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.orderId}
                onClick={() => navigate(`/order/${order.orderId}`)}
                className="bg-white p-4 rounded-3xl border border-slate-200 hover:border-emerald-500 transition cursor-pointer shadow-card space-y-3"
              >
                {/* Header: Dealer name, status badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {order.dealerSnapshot?.businessName}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>·</span>
                      <span className="font-mono">#{order.orderId}</span>
                    </div>
                  </div>

                  <OrderStatusBadge status={order.status} size="sm" />
                </div>

                {/* Materials preview */}
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[200px] text-slate-600 font-medium">
                    {order.selectedMaterials.map((m) => `${m.name} (${m.estimatedWeightKg}${m.unit})`).join(', ')}
                  </div>
                  <div className="flex items-center space-x-0.5 font-extrabold text-emerald-800 flex-shrink-0">
                    <span>₹{order.finalTotalAmount || order.estimatedTotalAmount}</span>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                  <span className="truncate max-w-[240px]">📍 {order.pickupAddress}</span>
                  <div className="flex items-center text-emerald-600 font-bold">
                    <span>View details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
