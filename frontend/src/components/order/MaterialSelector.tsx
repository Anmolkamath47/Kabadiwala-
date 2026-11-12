import React from 'react';
import { ScrapRateItem, SelectedMaterialItem } from '../../types';
import { Plus, Minus, Check, Sparkles, X, Trash2 } from 'lucide-react';

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

  const handleRemove = (rate: ScrapRateItem) => {
    onChange(selectedMaterials.filter((m) => m.name !== rate.name));
  };

  const handleToggle = (rate: ScrapRateItem) => {
    if (isSelected(rate)) {
      handleRemove(rate);
    } else {
      const defaultWeight = rate.minQuantityKg || 1;
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
    const item = selectedMaterials.find((m) => m.name === rate.name);
    if (!item) return;

    const step = rate.unit === 'piece' ? 1 : item.estimatedWeightKg > 5 ? 5 : 1;
    const newWeight = item.estimatedWeightKg + delta * step;

    // If reduced to 0 or below, remove item
    if (newWeight <= 0) {
      handleRemove(rate);
      return;
    }

    const updated = selectedMaterials.map((m) => {
      if (m.name === rate.name) {
        return {
          ...m,
          estimatedWeightKg: newWeight,
          calculatedAmount: Math.round(newWeight * m.pricePerKg),
        };
      }
      return m;
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
        <span className="text-xs text-slate-500 font-medium">
          {selectedMaterials.length === 0
            ? 'Tap any scrap item to add'
            : `${selectedMaterials.length} item(s) selected`}
        </span>
      </div>

      {/* Item Selection Cards */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {sortedRates.map((rate, idx) => {
          const selected = isSelected(rate);
          const currentItem = getSelectedItem(rate);

          return (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition duration-150 ${
                selected
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggle(rate)}
                  className="flex items-center space-x-3 text-left flex-1 min-w-0 py-0.5 cursor-pointer"
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                      selected
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-900 truncate">{rate.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Rate: <span className="font-bold text-emerald-700">₹{rate.pricePerKg}</span>/{rate.unit}
                    </div>
                  </div>
                </button>

                {selected && currentItem && (
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {/* Stepper */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWeightChange(rate, -1);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
                        title={currentItem.estimatedWeightKg <= 1 ? 'Remove scrap item' : 'Decrease weight'}
                      >
                        {currentItem.estimatedWeightKg <= 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="w-12 text-center text-xs font-extrabold text-slate-800">
                        {currentItem.estimatedWeightKg} {rate.unit}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWeightChange(rate, 1);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
                        title="Increase weight"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Calculated Amount */}
                    <div className="w-12 text-right">
                      <span className="text-xs font-extrabold text-emerald-800">
                        ₹{currentItem.calculatedAmount}
                      </span>
                    </div>

                    {/* Explicit Remove Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(rate);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Remove this scrap item"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
