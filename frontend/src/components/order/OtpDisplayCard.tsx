import React, { useState } from 'react';
import { KeyRound, Copy, Check, ShieldCheck } from 'lucide-react';

interface OtpDisplayCardProps {
  otpCode: string;
  isVerified?: boolean;
}

export const OtpDisplayCard: React.FC<OtpDisplayCardProps> = ({
  otpCode,
  isVerified = false,
}) => {
  const [copied, setCopied] = useState(false);
  const safeOtp = String(otpCode || '----');

  const handleCopy = () => {
    navigator.clipboard.writeText(safeOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-5 shadow-xl border border-emerald-800/50 relative overflow-hidden">
      {/* Background ambient pattern */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-emerald-300 text-xs font-semibold">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <span>PICKUP VERIFICATION CODE</span>
        </div>
        {isVerified ? (
          <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VERIFIED</span>
          </span>
        ) : (
          <span className="bg-emerald-800/80 text-emerald-200 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-700">
            Secure OTP
          </span>
        )}
      </div>

      {/* OTP Display Blocks */}
      <div className="mt-4 flex items-center justify-center space-x-3">
        {safeOtp.split('').map((digit, idx) => (
          <div
            key={idx}
            className="w-12 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-3xl font-extrabold text-white tracking-wider shadow-inner"
          >
            {digit}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-white/10">
        <p className="text-emerald-200/80 text-[11px] leading-tight max-w-[220px]">
          Share this OTP with dealer only when they arrive at your location.
        </p>

        <button
          onClick={handleCopy}
          className="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};
