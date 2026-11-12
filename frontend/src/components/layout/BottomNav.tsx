import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Navigation, Clock, User, ShoppingBag, Coins } from 'lucide-react';
import { useOrder } from '../../context/OrderContext';

export const BottomNav: React.FC = () => {
  const { activeOrder } = useOrder();
  const hasActivePickup =
    activeOrder &&
    ['PENDING', 'ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED', 'OTP_PENDING', 'OTP_VERIFIED'].includes(
      activeOrder.status
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-sheet">
      <div className="max-w-md mx-auto flex items-center justify-around py-1.5 px-0.5">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/store"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition relative ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`
          }
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span>Store</span>
        </NavLink>

        {hasActivePickup && (
          <NavLink
            to={`/order/${activeOrder.orderId}`}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition relative ${
                isActive ? 'text-emerald-700' : 'text-amber-600 hover:text-amber-700'
              }`
            }
          >
            <div className="relative">
              <Navigation className="w-5 h-5 mb-0.5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <span>Track</span>
          </NavLink>
        )}

        <NavLink
          to="/orders"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`
          }
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span>Orders</span>
        </NavLink>

        <NavLink
          to="/wallet"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`
          }
        >
          <Coins className="w-5 h-5 mb-0.5" />
          <span>Wallet</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`
          }
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
