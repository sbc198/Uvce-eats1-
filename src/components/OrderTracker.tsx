import React, { useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  AlertCircle,
  Receipt,
  QrCode,
  ArrowRight,
  ExternalLink,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { soundService } from '../services/sound';

interface OrderTrackerProps {
  orders: Order[];
  onOpenUpiModal: (order: Order) => void;
  onReorder: (order: Order) => void;
  isKannada?: boolean;
}

const STATUS_STEPS: OrderStatus[] = [
  'Order Placed',
  'Accepted',
  'Preparing',
  'Ready for Pickup',
  'Collected',
];

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  orders,
  onOpenUpiModal,
  onReorder,
  isKannada = false,
}) => {
  const previousStatusMap = useRef<Record<string, OrderStatus>>({});

  // Sound chime when any order changes to Ready for Pickup
  useEffect(() => {
    orders.forEach(order => {
      const prevStatus = previousStatusMap.current[order.id];
      if (prevStatus && prevStatus !== order.status) {
        if (order.status === 'Ready for Pickup') {
          soundService.playReadyAlert();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🍔 UVCE Eats: Food Ready!', {
              body: `Token #${order.tokenNumber}: Your order #${order.id} is ready for pickup at the counter!`,
            });
          }
        } else if (order.status === 'Accepted' || order.status === 'Preparing') {
          soundService.playChime();
        }
      }
      previousStatusMap.current[order.id] = order.status;
    });
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-10 text-center text-gray-500 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto flex items-center justify-center text-3xl mb-3">
          📦
        </div>
        <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
          {isKannada ? 'ಯಾವುದೇ ಸಕ್ರಿಯ ಆದೇಶಗಳಿಲ್ಲ' : 'No active orders right now'}
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          {isKannada
            ? 'ಮೆನುವಿನಿಂದ ತಿಂಡಿಗಳನ್ನು ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ ಮತ್ತು ನಿಮ್ಮ ಆರ್ಡರ್ ಇರಿಸಿ!'
            : 'Select hot snacks, dosa, or sandwiches from the menu above to skip the campus line!'}
        </p>
      </div>
    );
  }

  const getStatusIndex = (status: OrderStatus) => {
    return STATUS_STEPS.indexOf(status);
  };

  return (
    <div className="space-y-4">
      {orders.map(order => {
        const stepIdx = getStatusIndex(order.status);
        const isReady = order.status === 'Ready for Pickup';
        const isCollected = order.status === 'Collected';

        return (
          <div
            key={order.id}
            className={`border rounded-3xl p-5 bg-white dark:bg-gray-900 shadow-sm transition-all relative overflow-hidden ${
              isReady
                ? 'border-emerald-400 dark:border-emerald-600 ring-4 ring-emerald-500/10'
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            {/* Top Banner on Ready */}
            {isReady && (
              <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 flex items-center justify-between text-emerald-800 dark:text-emerald-300 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <div>
                    <strong className="text-xs font-black uppercase tracking-wider block">
                      {isKannada ? 'ನಿಮ್ಮ ಆರ್ಡರ್ ಸಿದ್ಧವಾಗಿದೆ!' : 'Food is Ready at Counter!'}
                    </strong>
                    <span className="text-[11px]">
                      {isKannada
                        ? `ಟೋಕನ್ #${order.tokenNumber} ತೋರಿಸಿ ಮತ್ತು ಆಹಾರವನ್ನು ಪಡೆದುಕೊಳ್ಳಿ.`
                        : `Show Token #${order.tokenNumber} at the Nandini counter to collect.`}
                    </span>
                  </div>
                </div>
                <div className="bg-emerald-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-xs">
                  TOKEN #{order.tokenNumber}
                </div>
              </div>
            )}

            {/* Header with Token & ID */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${
                    isReady
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                      : isCollected
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                      : 'bg-red-100 dark:bg-red-950/60 text-[#c9272c]'
                  }`}
                >
                  <span className="text-[9px] uppercase tracking-tighter font-extrabold leading-none">
                    TOKEN
                  </span>
                  <span className="text-xl leading-none mt-0.5">#{order.tokenNumber}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                      Order #{order.id}
                    </h3>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isReady
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : order.status === 'Preparing'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : order.status === 'Accepted'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : isCollected
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                    <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pickup: {order.pickupTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total & Payment Status */}
              <div className="text-right">
                <span className="text-lg font-black text-gray-900 dark:text-white block">
                  ₹{order.total}
                </span>
                <span
                  className={`text-[11px] font-bold inline-block px-2 py-0.5 rounded-md ${
                    order.paymentStatus.includes('Verified') || order.paymentStatus.includes('Paid')
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  {order.paymentMethod} • {order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="my-4">
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {STATUS_STEPS.slice(0, 4).map((stepName, i) => {
                  const isPassed = stepIdx >= i;
                  return (
                    <div key={stepName} className="flex flex-col gap-1">
                      <div
                        className={`h-2 rounded-full transition-colors ${
                          isPassed
                            ? isReady && i === 3
                              ? 'bg-emerald-500'
                              : 'bg-[#c9272c]'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold truncate ${
                          isPassed
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        {stepName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items list */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3 text-xs space-y-1.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-gray-700 dark:text-gray-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span>{item.emoji || '🍽️'}</span>
                    <span>{item.name}</span>
                    <span className="text-gray-400 font-bold">× {item.qty}</span>
                  </span>
                  <span className="font-mono font-bold">₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>

            {/* Bottom Actions & Details */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>Nandini Canteen · UVCE K.R. Circle</span>
              </div>

              <div className="flex items-center gap-2">
                {order.paymentMethod === 'Online UPI' &&
                  !order.paymentStatus.includes('Verified') && (
                    <button
                      onClick={() => onOpenUpiModal(order)}
                      className="px-3 py-1.5 bg-red-50 dark:bg-red-950 text-[#c9272c] hover:bg-red-100 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      {order.upiTransactionId ? 'View / Update UPI' : 'Pay UPI Now'}
                    </button>
                  )}
                <button
                  onClick={() => onReorder(order)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Reorder
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
