import React from 'react';
import { OrderStatus } from '../../types';
import {
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  KeyRound,
  CheckCheck,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const configMap: Record<
    OrderStatus,
    { label: string; icon: any; bg: string; text: string; border: string }
  > = {
    PENDING: {
      label: 'Waiting for Dealer',
      icon: Clock,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    ACCEPTED: {
      label: 'Dealer Accepted',
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    DEALER_EN_ROUTE: {
      label: 'Dealer En Route',
      icon: Truck,
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
    },
    ARRIVED: {
      label: 'Dealer Arrived at Doorstep',
      icon: MapPin,
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
    },
    OTP_PENDING: {
      label: 'OTP Verification Pending',
      icon: KeyRound,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    OTP_VERIFIED: {
      label: 'Pickup Verified (Weighing)',
      icon: CheckCheck,
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
    },
    COMPLETED: {
      label: 'Pickup Completed',
      icon: CheckCheck,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    CANCELLED: {
      label: 'Cancelled',
      icon: XCircle,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
    },
    REJECTED: {
      label: 'Dealer Busy / Declined',
      icon: AlertCircle,
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
    },
  };

  const current = configMap[status] || configMap.PENDING;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 space-x-1',
    md: 'text-xs px-2.5 py-1 space-x-1.5',
    lg: 'text-sm px-3.5 py-1.5 space-x-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]}`}
    >
      <Icon className={`${iconSizes[size]} flex-shrink-0`} />
      <span>{current.label}</span>
    </span>
  );
};
