import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Copy, ExternalLink, QrCode, ShieldAlert, Sparkles, X } from 'lucide-react';
import { submitUpiTransactionId } from '../services/db';
import { soundService } from '../services/sound';

interface UpiPaymentModalProps {
  orderId: string;
  amount: number;
  upiVpa: string;
  upiPayeeName: string;
  onClose: () => void;
  onPaymentSubmitted: (utr: string) => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  orderId,
  amount,
  upiVpa,
  upiPayeeName,
  onClose,
  onPaymentSubmitted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  // Standard NPCI UPI URI specifications
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(
    upiPayeeName
  )}&am=${amount.toFixed(2)}&tn=${encodeURIComponent('Order ' + orderId)}&cu=INR`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        upiUri,
        {
          width: 210,
          margin: 2,
          color: {
            dark: '#1e293b',
            light: '#ffffff',
          },
        },
        error => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [upiUri]);

  // Payment timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyVpa = async () => {
    try {
      await navigator.clipboard.writeText(upiVpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      alert('Please enter a valid 12-digit UPI Reference / UTR Number.');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitUpiTransactionId(orderId, utrNumber.trim());
      soundService.playChime();
      setSubmitted(true);
      onPaymentSubmitted(utrNumber.trim());
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Failed to submit UTR:', err);
      alert('Error saving transaction ID. Please check your network.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/50 text-[#c9272c] flex items-center justify-center font-bold text-lg">
              ⚡
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                Real UPI Instant Payment
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Order #{orderId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between shadow-md shadow-red-500/20">
          <div>
            <span className="text-xs font-semibold text-red-100 uppercase tracking-wider block">
              Payable Amount
            </span>
            <span className="text-3xl font-black">₹{amount.toFixed(0)}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-red-200 block">Expires in</span>
            <span className="font-mono text-sm font-bold bg-white/20 px-2 py-0.5 rounded-md">
              {formatTimer(timeLeft)}
            </span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="my-5 flex flex-col items-center">
          <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-red-200 dark:border-gray-700 shadow-sm relative group">
            <canvas ref={canvasRef} className="block rounded-lg" />
            <div className="absolute inset-x-0 -bottom-2 flex justify-center">
              <span className="bg-[#c9272c] text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <QrCode className="w-3 h-3" /> SCAN WITH ANY UPI APP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
            <span>Payee:</span>
            <span className="text-gray-900 dark:text-white font-bold">{upiPayeeName}</span>
          </div>

          {/* Copy VPA */}
          <div className="mt-2 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-200">{upiVpa}</span>
            <button
              onClick={handleCopyVpa}
              className="text-xs text-[#c9272c] font-bold flex items-center gap-1 hover:underline ml-1"
            >
              {copied ? (
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Copied!
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Direct UPI Apps Button for Mobile */}
        <div className="mb-4">
          <a
            href={upiUri}
            className="w-full flex items-center justify-center gap-2 bg-[#15803d] hover:bg-[#166534] text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open in GPay / PhonePe / Paytm / BHIM
          </a>
          <p className="text-[11px] text-center text-gray-500 mt-1">
            Tap button on phone to launch your installed UPI payment app automatically.
          </p>
        </div>

        {/* UTR Verification Input */}
        <form onSubmit={handleSubmitUtr} className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Already Paid? Enter 12-Digit UPI Ref / UTR No:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 429182749102"
              value={utrNumber}
              onChange={e => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
              maxLength={20}
              className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || submitted}
              className="bg-[#c9272c] hover:bg-[#a91e24] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : submitted ? 'Verified ✓' : 'Submit UTR'}
            </button>
          </div>
          {submitted ? (
            <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1 justify-center">
              <CheckCircle2 className="w-4 h-4" /> UTR recorded! Canteen staff will verify your order.
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              Submitting UTR gives kitchen staff instant payment proof for priority preparation.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
