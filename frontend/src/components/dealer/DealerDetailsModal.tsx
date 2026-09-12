import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Dealer, ScrapCategory } from '../../types';
import { Star, ShieldCheck, Truck, MapPin, Phone, ArrowRight } from 'lucide-react';

interface DealerDetailsModalProps {
  dealer: Dealer | null;
  isOpen: boolean;
  onClose: () => void;
  onBookNow: (dealer: Dealer) => void;
}

export const DealerDetailsModal: React.FC<DealerDetailsModalProps> = ({
  dealer,
  isOpen,
  onClose,
  onBookNow,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!dealer) return null;

  const categories = ['ALL', ...Array.from(new Set(dealer.scrapRates.map((r) => r.category)))];

  const filteredRates =
    selectedCategory === 'ALL'
      ? dealer.scrapRates
      : dealer.scrapRates.filter((r) => r.category === selectedCategory);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scrap Dealer Profile">
      <div className="space-y-4">
        {/* Dealer Header */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">{dealer.businessName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Contact: {dealer.contactPerson}</p>
            </div>
            <div className="flex items-center space-x-1 bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg text-amber-900 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{dealer.rating.toFixed(1)}</span>
              <span className="text-[10px] text-amber-800">({dealer.totalRatings})</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{dealer.distanceKm} km away</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">{dealer.vehicleType}</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Government Scrap Partner</span>
            </span>
            <span className="flex items-center space-x-1 text-slate-600">
              <Phone className="w-3 h-3" />
              <span>{dealer.phone}</span>
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div>
          <div className="text-xs font-bold text-slate-800 mb-2">Scrap Rates Catalogue</div>
          <div className="flex space-x-1.5 overflow-x-auto pb-1.5 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Rates Table / List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {filteredRates.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 bg-white transition"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">{item.name}</div>
                <div className="text-[10px] text-slate-400">
                  Category: {item.category} {item.minQuantityKg ? `· Min: ${item.minQuantityKg} ${item.unit}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-emerald-700">
                  ₹{item.pricePerKg}
                  <span className="text-[10px] font-normal text-slate-500">/{item.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            onClose();
            onBookNow(dealer);
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
        >
          <span>Proceed with {dealer.businessName}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Modal>
  );
};
