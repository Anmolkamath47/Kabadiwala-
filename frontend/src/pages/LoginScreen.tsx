import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { requestOtp } = useAuth();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phone.replace(/\D/g, '');

    if (cleanNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const fullPhone = `+91${cleanNumber.slice(-10)}`;
      const res = await requestOtp(fullPhone);

      navigate('/otp-verify', {
        state: {
          phone: fullPhone,
          demoOtp: res.demoOtp,
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto p-5 shadow-2xl">
      {/* Top Banner */}
      <div className="pt-8">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Kabadiwala</h1>
            <p className="text-xs font-semibold text-emerald-600">Consumer Scrap App</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-extrabold text-slate-900">Enter your mobile number</h2>
          <p className="text-xs text-slate-500 mt-1">
            We will send a 4-digit verification code to log in or create an account.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mobile Number
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center space-x-1.5 text-slate-500 border-r border-slate-200 pr-2">
                <span className="text-sm font-bold">🇮🇳 +91</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                maxLength={12}
                className="w-full pl-24 pr-4 py-3.5 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-base font-bold text-slate-900 outline-none transition shadow-xs"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-600 font-semibold mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !phone}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-md mt-4"
          >
            <span>{isSubmitting ? 'Sending OTP...' : 'Get OTP'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer Security Badges */}
      <div className="pb-4 pt-8 text-center border-t border-slate-200/80">
        <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>100% Verified Scrap Dealers · Digital Weighing</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          By continuing, you agree to Kabadiwala Terms of Service & Privacy Policy.
        </p>
      </div>
    </div>
  );
};
