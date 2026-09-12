import React from 'react';
import { Star, MapPin, CheckCircle, Truck, ChevronRight, ArrowRight } from 'lucide-react';
import { Dealer } from '../../types';

interface DealerCardProps {
  dealer: Dealer;
  onSelect: (dealer: Dealer) => void;
  onViewDetails: (dealer: Dealer) => void;
}

export const DealerCard: React.FC<DealerCardProps> = ({
  dealer,
  onSelect,
  onViewDetails,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card hover:shadow-md transition duration-200 flex flex-col justify-between">
      {/* Top row: Name, rating, distance */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-slate-900 text-base truncate">{dealer.businessName}</h3>
              {dealer.isOnline === false ? (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                  Offline
                </span>
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{dealer.address}</p>
          </div>

          <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg text-amber-900 text-xs font-bold flex-shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{dealer.rating.toFixed(1)}</span>
            <span className="text-[10px] text-amber-700 font-normal">({dealer.totalRatings})</span>
          </div>
        </div>

        {/* Vehicle & Distance Tag */}
        <div className="flex items-center space-x-3 mt-2.5 text-xs text-slate-600">
          <div className="flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded-md">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-slate-700">{dealer.distanceKm} km</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">~{dealer.etaMinutes} mins</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-500 truncate">
            <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{dealer.vehicleType || 'Electric Loader'}</span>
          </div>
        </div>

        {/* Scrap Rates preview chips */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Verified Scrap Rates</span>
            <button
              onClick={() => onViewDetails(dealer)}
              className="text-emerald-600 hover:text-emerald-700 font-semibold normal-case text-xs flex items-center"
            >
              All rates <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {dealer.scrapRates.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-xl p-2 border border-slate-100 flex flex-col justify-between"
              >
                <span className="text-[10px] text-slate-500 font-medium truncate">{item.name}</span>
                <span className="text-xs font-extrabold text-emerald-700 mt-0.5">
                  ₹{item.pricePerKg}
                  <span className="text-[10px] text-slate-500 font-normal">/{item.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4 flex items-center space-x-2">
        <button
          onClick={() => onSelect(dealer)}
          disabled={dealer.isOnline === false}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow-xs"
        >
          <span>{dealer.isOnline === false ? 'Dealer Currently Offline' : 'Book Scrap Pickup'}</span>
          {dealer.isOnline !== false && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
