import React from 'react';
import { Moon, Sun, Languages, User, LogOut, Shield, ChefHat, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  portal: 'student' | 'owner';
  onSelectPortal: (p: 'student' | 'owner') => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isKannada: boolean;
  onToggleLanguage: () => void;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  portal,
  onSelectPortal,
  isDarkMode,
  onToggleTheme,
  isKannada,
  onToggleLanguage,
  onOpenLogin,
}) => {
  const { userProfile, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectPortal('student')}>
          <div className="w-10 h-10 rounded-2xl bg-[#c9272c] text-white flex items-center justify-center text-xl shadow-md shadow-red-500/20 font-black">
            🍔
          </div>
          <div>
            <div className="font-black text-lg tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5 leading-none">
              UVCE EATS
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-[#c9272c]">
                K.R. Circle
              </span>
            </div>
            <span className="text-[10px] tracking-wider text-gray-500 dark:text-gray-400 font-bold block mt-0.5 uppercase">
              {isKannada ? 'ಕ್ಯಾಂಪಸ್ ಆಹಾರ, ಸುಲಭವಾಗಿ' : 'Campus Food, Made Easy'}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-extrabold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
            title="Toggle language"
          >
            <Languages className="w-3.5 h-3.5 text-[#c9272c]" />
            <span>{isKannada ? 'English' : 'ಕನ್ನಡ'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Portal Switch */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => onSelectPortal('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                portal === 'student'
                  ? 'bg-white dark:bg-gray-900 text-[#c9272c] shadow-xs'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              🎓 {isKannada ? 'ವಿದ್ಯಾರ್ಥಿ' : 'Student'}
            </button>
            <button
              onClick={() => onSelectPortal('owner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                portal === 'owner'
                  ? 'bg-white dark:bg-gray-900 text-[#c9272c] shadow-xs'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              🧑‍🍳 {isKannada ? 'ಮಾಲೀಕರು' : 'Owner'}
              {isAdmin && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
          </div>

          {/* User Profile or Sign-in */}
          {userProfile ? (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-2.5 pr-1.5 py-1 rounded-xl text-xs">
              <span className="font-extrabold text-gray-900 dark:text-white max-w-[100px] truncate">
                {userProfile.displayName}
              </span>
              <button
                onClick={signOut}
                title="Sign out"
                className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-red-600 flex items-center justify-center transition-colors"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="bg-[#c9272c] hover:bg-[#a91e24] text-white text-xs font-extrabold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1 active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              <span>{isKannada ? 'ಲಾಗಿನ್' : 'Login'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
