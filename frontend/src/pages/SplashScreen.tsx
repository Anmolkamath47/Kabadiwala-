import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Recycle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          navigate('/');
        } else {
          navigate('/login');
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-between p-6 select-none">
      <div className="w-full flex justify-end">
        <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
          Clean India · Green Future
        </span>
      </div>

      <div className="flex flex-col items-center text-center space-y-4 max-w-xs">
        {/* Brand Logo */}
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl bg-white p-1.5 flex items-center justify-center shadow-2xl ring-8 ring-emerald-500/20 overflow-hidden">
            <img src="/logo.png" alt="Scrapify" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 p-1.5 rounded-full shadow">
            <Sparkles className="w-4 h-4 fill-slate-900" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Scrapify</h1>
          <p className="text-xs text-emerald-300 font-semibold mt-1">
            Doorstep Scrap Pickup & Best Rates
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Sell your household & commercial scrap to verified nearby dealers in minutes.
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col items-center space-y-2">
        <div className="w-8 h-1 bg-emerald-500/50 rounded-full overflow-hidden">
          <div className="w-full h-full bg-emerald-400 animate-pulse"></div>
        </div>
        <span className="text-[10px] text-slate-500">v1.0.0 · Production Ready</span>
      </div>
    </div>
  );
};
