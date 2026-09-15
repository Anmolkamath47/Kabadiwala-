import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, User, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AppHeaderProps {
  onOpenLocationSelect?: () => void;
  title?: string;
  showBack?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenLocationSelect,
  title,
  showBack = false,
}) => {
  const navigate = useNavigate();
  const { selectedLocation, user, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {showBack ? (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
              title="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-slate-900 line-clamp-1">{title || 'Scrapify'}</h1>
          </div>
        ) : (
          <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
            <button
              onClick={() => navigate('/')}
              className="flex-shrink-0 flex items-center space-x-2 focus:outline-none"
            >
              <img
                src="/logo.png"
                alt="Scrapify"
                className="w-8 h-8 rounded-lg object-contain bg-white shadow-xs border border-slate-100 p-0.5"
              />
              <span className="font-extrabold text-emerald-700 tracking-tight text-lg hidden sm:inline">
                Scrapify
              </span>
            </button>

            {/* Location selector button */}
            <button
              onClick={onOpenLocationSelect || (() => navigate('/location'))}
              className="flex items-center space-x-1.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-full transition max-w-[200px] sm:max-w-xs flex-1 min-w-0"
            >
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-slate-900 leading-none truncate">
                  {selectedLocation?.label || 'Pickup Location'}
                </div>
                <div className="text-[10px] text-slate-500 truncate leading-tight">
                  {selectedLocation?.address || 'Set your scrap pickup address'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Profile / Login */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm hover:bg-emerald-100 transition shadow-xs overflow-hidden"
              title="Your Profile"
            >
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : user?.name ? (
                user.name.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full transition shadow-xs"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
