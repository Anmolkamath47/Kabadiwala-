import React, { useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { simulatorService } from '../../services/simulatorService';
import {
  Wrench,
  Check,
  Truck,
  MapPin,
  KeyRound,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';

export const DealerSimulatorDrawer: React.FC = () => {
  const { activeOrder } = useOrder();
  const [isOpen, setIsOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!activeOrder) return null;

  const orderId = activeOrder.orderId;
  const dealerId = activeOrder.dealerId;
  const currentStatus = activeOrder.status;

  const handleAction = async (actionFn: () => Promise<any>, actionName: string) => {
    setIsSimulating(true);
    setStatusMessage(`Dispatching ${actionName}...`);
    try {
      await actionFn();
      setStatusMessage(`✅ ${actionName} triggered successfully!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`❌ Error: ${err.message || 'Action failed'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed bottom-16 right-3 z-40 max-w-xs w-full">
      {/* Drawer Card */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden transition-all duration-300">
        {/* Toggle bar */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 flex items-center justify-between text-xs font-bold transition"
        >
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400">Dealer Simulator Gateway</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="p-3.5 space-y-2.5 text-xs">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Order State:</span>
              <span className="font-mono font-bold text-amber-400">{currentStatus}</span>
            </div>

            {statusMessage && (
              <div className="text-[11px] p-2 bg-slate-800 rounded-lg text-emerald-300 font-medium">
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {/* Step 1: Accept */}
              {currentStatus === 'PENDING' && (
                <button
                   disabled={isSimulating}
                   onClick={() =>
                     handleAction(
                       () =>
                         simulatorService.acceptOrder(
                           orderId,
                           dealerId,
                           activeOrder.dealerLiveLocation?.coordinates
                         ),
                       'Dealer Accept'
                     )
                   }
                   className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>1. Simulate Dealer Accept</span>
                </button>
              )}

              {/* Step 2: Start Trip */}
              {currentStatus === 'ACCEPTED' && (
                <button
                  disabled={isSimulating}
                  onClick={() =>
                    handleAction(
                      () => simulatorService.startTrip(orderId, dealerId),
                      'Dealer En Route'
                    )
                  }
                  className="w-full bg-blue-600 hover:bg-blue-500 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition"
                >
                  <Truck className="w-4 h-4" />
                  <span>2. Start Trip (En Route)</span>
                </button>
              )}

              {/* Step 3: Move GPS */}
              {currentStatus === 'DEALER_EN_ROUTE' && (
                <>
                  <button
                    disabled={isSimulating}
                    onClick={() => {
                      const baseLng = activeOrder.pickupLocation.coordinates[0];
                      const baseLat = activeOrder.pickupLocation.coordinates[1];
                      handleAction(
                        () =>
                          simulatorService.sendLocationPing(
                            orderId,
                            dealerId,
                            [baseLng + 0.003, baseLat + 0.002],
                            60
                          ),
                        'Move Dealer GPS Closer'
                      );
                    }}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Send Live GPS Ping</span>
                  </button>

                  <button
                    disabled={isSimulating}
                    onClick={() =>
                      handleAction(
                        () => simulatorService.dealerArrived(orderId, dealerId),
                        'Dealer Arrived'
                      )
                    }
                    className="w-full bg-purple-600 hover:bg-purple-500 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>3. Dealer Arrived at Doorstep</span>
                  </button>
                </>
              )}

              {/* Step 4: Verify OTP */}
              {(currentStatus === 'ARRIVED' || currentStatus === 'OTP_PENDING') && (
                <button
                  disabled={isSimulating}
                  onClick={() =>
                    handleAction(
                      () => simulatorService.verifyOtp(orderId, dealerId, activeOrder.otp.code),
                      'Verify Pickup OTP'
                    )
                  }
                  className="w-full bg-teal-600 hover:bg-teal-500 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>4. Verify OTP ({activeOrder.otp.code})</span>
                </button>
              )}

              {/* Step 5: Complete Order */}
              {currentStatus === 'OTP_VERIFIED' && (
                <button
                  disabled={isSimulating}
                  onClick={() => {
                    const finalWeights = activeOrder.selectedMaterials.map((m) => ({
                      category: m.category,
                      name: m.name,
                      unit: m.unit,
                      pricePerKg: m.pricePerKg,
                      actualWeightKg: m.estimatedWeightKg + 2, // 2kg bonus scrap
                      finalAmount: (m.estimatedWeightKg + 2) * m.pricePerKg,
                    }));
                    const finalTotal = finalWeights.reduce((a, b) => a + b.finalAmount, 0);

                    handleAction(
                      () =>
                        simulatorService.completeOrder(
                          orderId,
                          dealerId,
                          finalWeights,
                          finalTotal
                        ),
                      'Complete Scrap Pickup'
                    );
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>5. Complete Pickup & Payout</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
