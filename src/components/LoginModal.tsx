import React, { useState } from 'react';
import { X, Lock, Sparkles, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundService } from '../services/sound';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isKannada?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  isKannada = false,
}) => {
  const { signInWithGoogle, signInAsStudentDemo, unlockOwnerWithPin } = useAuth();
  const [activeMode, setActiveMode] = useState<'student' | 'owner'>('student');
  const [studentName, setStudentName] = useState('');
  const [usn, setUsn] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      soundService.playChime();
      onClose();
    } catch {
      setErrorMsg('Google Sign-In was cancelled or unavailable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentFastLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    const finalUsn = usn.trim() ? usn.trim().toUpperCase() : '1UV24CS' + Math.floor(100 + Math.random() * 900);
    setIsSubmitting(true);
    try {
      await signInAsStudentDemo(studentName.trim(), finalUsn);
      soundService.playChime();
      onClose();
    } catch {
      setErrorMsg('Failed to initialize student profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOwnerUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockOwnerWithPin(ownerPin)) {
      soundService.playChime();
      onClose();
    } else {
      setErrorMsg('Incorrect PIN. Default demo PIN is 1234.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#c9272c] mx-auto flex items-center justify-center text-2xl font-black mb-2 shadow-xs">
            🎓
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {isKannada ? 'ಯುವಿಸಿಇ ಈಟ್ಸ್ ಲಾಗಿನ್' : 'UVCE Eats Secure Sign-In'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isKannada ? 'ಕ್ಯಾಂಪಸ್ ಖಾತೆಗೆ ಲಾಗಿನ್ ಮಾಡಿ' : 'Personalized campus food ordering & live order sync'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-4">
          <button
            onClick={() => {
              setActiveMode('student');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeMode === 'student'
                ? 'bg-white dark:bg-gray-900 text-[#c9272c] shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            🎓 UVCE Student
          </button>
          <button
            onClick={() => {
              setActiveMode('owner');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeMode === 'owner'
                ? 'bg-white dark:bg-gray-900 text-[#c9272c] shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            🧑‍🍳 Canteen Staff / Owner
          </button>
        </div>

        {activeMode === 'student' ? (
          <div className="space-y-4">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-800 dark:text-gray-100 font-extrabold py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign In with Google (Firebase)
            </button>

            <div className="flex items-center gap-2 my-2">
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
              <span className="text-[11px] uppercase font-bold text-gray-400">or student fast login</span>
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
            </div>

            {/* USN / Student Form */}
            <form onSubmit={handleStudentFastLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shashank C"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  USN / Student ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1UV24CS088"
                  value={usn}
                  onChange={e => setUsn(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500 uppercase font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#c9272c] hover:bg-[#a91e24] text-white font-extrabold py-3 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.98]"
              >
                Continue to Menu →
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleOwnerUnlock} className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl border border-red-100 dark:border-red-900 text-xs text-red-800 dark:text-red-300">
              <ShieldCheck className="w-4 h-4 inline mr-1 text-[#c9272c]" />
              <strong>Canteen Terminal Gate:</strong> Enter staff PIN (Default demo PIN is <code>1234</code>) to manage orders and menu.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Owner PIN
              </label>
              <input
                type="password"
                placeholder="1234"
                value={ownerPin}
                onChange={e => setOwnerPin(e.target.value)}
                className="w-full text-center text-lg tracking-widest font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-black text-white font-extrabold py-3 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.98]"
            >
              Unlock Canteen Terminal
            </button>
          </form>
        )}

        {errorMsg && (
          <p className="mt-3 text-xs font-bold text-red-600 text-center">{errorMsg}</p>
        )}
      </div>
    </div>
  );
};
