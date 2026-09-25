import React from 'react';
import { ScrapRateItem, SelectedMaterialItem } from '../../types';
import { Plus, Minus, Check, Sparkles, Zap } from 'lucide-react';

interface MaterialSelectorProps {
  availableRates: ScrapRateItem[];
  selectedMaterials: SelectedMaterialItem[];
  onChange: (items: SelectedMaterialItem[]) => void;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  availableRates,
  selectedMaterials,
  onChange,
}) => {
  // Sort availableRates with E-Waste prioritized first
  const sortedRates = [...availableRates].sort((a, b) => {
    if (a.category === 'E-Waste' && b.category !== 'E-Waste') return -1;
    if (a.category !== 'E-Waste' && b.category === 'E-Waste') return 1;
    return 0;
  });
  const isSelected = (rate: ScrapRateItem) => {
    return selectedMaterials.some((m) => m.name === rate.name);
  };

  const getSelectedItem = (rate: ScrapRateItem) => {
    return selectedMaterials.find((m) => m.name === rate.name);
  };

  const handleToggle = (rate: ScrapRateItem) => {
    if (isSelected(rate)) {
      onChange(selectedMaterials.filter((m) => m.name !== rate.name));
    } else {
      const defaultWeight = rate.minQuantityKg || (rate.unit === 'piece' ? 1 : 5);
      onChange([
        ...selectedMaterials,
        {
          category: rate.category,
          name: rate.name,
          unit: rate.unit,
          pricePerKg: rate.pricePerKg,
          estimatedWeightKg: defaultWeight,
          calculatedAmount: Math.round(defaultWeight * rate.pricePerKg),
        },
      ]);
    }
  };

  const handleWeightChange = (rate: ScrapRateItem, delta: number) => {
    const updated = selectedMaterials.map((item) => {
      if (item.name === rate.name) {
        const step = rate.unit === 'piece' ? 1 : (item.estimatedWeightKg >= 10 ? 5 : 1);
        const newWeight = Math.max(1, item.estimatedWeightKg + delta * step);
        return {
          ...item,
          estimatedWeightKg: newWeight,
          calculatedAmount: Math.round(newWeight * item.pricePerKg),
        };
      }
      return item;
    });
    onChange(updated);
  };

  const totalEstimatedPayout = selectedMaterials.reduce(
    (acc, item) => acc + item.calculatedAmount,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Select Scrap to Sell</h3>
        <span className="text-xs text-slate-500">
          {selectedMaterials.length} item(s) selected
        </span>
      </div>

      {/* Item Selection Cards */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {sortedRates.map((rate, idx) => {
          const selected = isSelected(rate);
          const currentItem = getSelectedItem(rate);
          const isEWaste = rate.category === 'E-Waste';

          return (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition duration-150 ${
                selected
                  ? isEWaste
                    ? 'border-amber-400 bg-amber-50/50 shadow-xs ring-1 ring-amber-300/30'
                    : 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                  : isEWaste
                  ? 'border-amber-200/80 bg-amber-50/20 hover:border-amber-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggle(rate)}
                  className="flex items-center space-x-3 text-left flex-1 min-w-0"
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                      selected
                        ? isEWaste
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">{rate.name}</span>
                      {isEWaste && (
                        <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-md text-[8px] font-black bg-amber-500 text-white flex-shrink-0 shadow-2xs">
                          <Zap className="w-2 h-2 fill-white" />
                          <span>PRIORITY</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Rate: <span className={`font-bold ${isEWaste ? 'text-amber-700' : 'text-emerald-700'}`}>₹{rate.pricePerKg}</span>/{rate.unit}
                    </div>
                  </div>
                </button>

                {selected && currentItem && (
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {/* Stepper */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleWeightChange(rate, -1)}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-12 text-center text-xs font-extrabold text-slate-800">
                        {currentItem.estimatedWeightKg} {rate.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleWeightChange(rate, 1)}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Calculated Amount */}
                    <div className="w-14 text-right">
                      <span className="text-xs font-extrabold text-emerald-800">
                        ₹{currentItem.calculatedAmount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total payout card */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-300 font-medium">Estimated Scrap Earning</div>
            <div className="text-xs text-slate-400">Paid in cash / UPI on weighing</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-emerald-400">₹{totalEstimatedPayout}</div>
        </div>
      </div>
    </div>
  );
};
