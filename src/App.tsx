/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { StudentPortal } from './components/StudentPortal';
import { AdminPortal } from './components/AdminPortal';
import { UpiPaymentModal } from './components/UpiPaymentModal';
import { LoginModal } from './components/LoginModal';
import {
  MenuItem,
  Order,
  CanteenConfig,
  Review,
} from './types';
import {
  subscribeToMenu,
  subscribeToCanteenConfig,
  subscribeToStudentOrders,
  subscribeToAllOrders,
  subscribeToReviews,
  seedCanteenDataIfEmpty,
  DEFAULT_CANTEEN_CONFIG,
  INITIAL_MENU_ITEMS,
} from './services/db';
import { Utensils, Package, ShieldCheck, User, Sparkles } from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, isAdmin } = useAuth();

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('uvce_dark') === '1';
  });

  // Kannada / English bilingual state
  const [isKannada, setIsKannada] = useState<boolean>(() => {
    return localStorage.getItem('uvce_lang') === 'kn';
  });

  // Current portal: 'student' or 'owner'
  const [portal, setPortal] = useState<'student' | 'owner'>('student');

  // Firestore Real-Time Data
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU_ITEMS as MenuItem[]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [config, setConfig] = useState<CanteenConfig>(DEFAULT_CANTEEN_CONFIG);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Modals
  const [activeUpiOrder, setActiveUpiOrder] = useState<Order | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Sync Dark mode with DOM
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('uvce_dark', '1');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('uvce_dark', '0');
    }
  }, [isDarkMode]);

  // Sync Language
  const toggleLanguage = () => {
    const next = !isKannada;
    setIsKannada(next);
    localStorage.setItem('uvce_lang', next ? 'kn' : 'en');
  };

  // Initial Seeding and Subscriptions
  useEffect(() => {
    seedCanteenDataIfEmpty();

    const unsubMenu = subscribeToMenu(items => {
      setMenu(items);
    });

    const unsubConfig = subscribeToCanteenConfig(cfg => {
      setConfig(cfg);
    });

    const unsubReviews = subscribeToReviews(revs => {
      setReviews(revs);
    });

    return () => {
      unsubMenu();
      unsubConfig();
      unsubReviews();
    };
  }, []);

  // Orders Subscription (Admin sees all, student sees their own)
  useEffect(() => {
    let unsubOrders: () => void;
    if (isAdmin) {
      unsubOrders = subscribeToAllOrders(allOrders => {
        setOrders(allOrders);
      });
    } else {
      const studentUid = currentUser?.uid || userProfile?.uid || localStorage.getItem('uvce_guest_uid') || '';
      if (studentUid) {
        unsubOrders = subscribeToStudentOrders(studentUid, studentOrders => {
          setOrders(studentOrders);
        });
      } else {
        // Fallback for new unauthenticated users
        unsubOrders = subscribeToAllOrders(allOrders => {
          // Show recent sample or empty
          setOrders(allOrders.slice(0, 5));
        });
      }
    }

    return () => {
      if (unsubOrders) unsubOrders();
    };
  }, [isAdmin, currentUser, userProfile]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f7fb] dark:bg-[#111827] text-[#202124] dark:text-[#f3f4f6] transition-colors pb-16 sm:pb-0">
      {/* Top Header */}
      <Header
        portal={portal}
        onSelectPortal={p => setPortal(p)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        isKannada={isKannada}
        onToggleLanguage={toggleLanguage}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
        {portal === 'student' ? (
          <StudentPortal
            menu={menu}
            orders={orders}
            config={config}
            reviews={reviews}
            isKannada={isKannada}
            onOpenUpiModal={order => setActiveUpiOrder(order)}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        ) : (
          <AdminPortal
            orders={orders}
            menu={menu}
            config={config}
            isKannada={isKannada}
          />
        )}
      </main>

      {/* Real UPI Payment Modal */}
      {activeUpiOrder && (
        <UpiPaymentModal
          orderId={activeUpiOrder.id}
          amount={activeUpiOrder.total}
          upiVpa={config.upiVpa}
          upiPayeeName={config.upiPayeeName}
          onClose={() => setActiveUpiOrder(null)}
          onPaymentSubmitted={() => {
            // refresh or feedback
          }}
        />
      )}

      {/* Login & Student Verification Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        isKannada={isKannada}
      />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-around text-[10px] font-extrabold shadow-lg">
        <button
          onClick={() => {
            setPortal('student');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 ${
            portal === 'student' ? 'text-[#c9272c]' : 'text-gray-400'
          }`}
        >
          <Utensils className="w-5 h-5" />
          <span>Menu</span>
        </button>

        <button
          onClick={() => {
            setPortal('student');
            const el = document.getElementById('studentOrdersSection');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <Package className="w-5 h-5" />
          <span>Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => {
            setPortal('owner');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 ${
            portal === 'owner' ? 'text-[#c9272c]' : 'text-gray-400'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Kitchen / Admin</span>
        </button>

        <button
          onClick={() => setIsLoginModalOpen(true)}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <User className="w-5 h-5" />
          <span>{userProfile ? 'Profile' : 'Sign In'}</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 text-xs py-8 px-4 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <strong className="text-gray-900 dark:text-white font-extrabold block text-sm">
              UVCE Eats — University Visvesvaraya College of Engineering
            </strong>
            <p className="text-[11px] mt-1 text-gray-400 max-w-lg leading-relaxed">
              Campus food pickup queue system. Powered by Firebase Firestore live database, Real UPI payments (NPCI standard intent), and live kitchen management.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Firebase Database Connected
            </span>
            <span>·</span>
            <span>K.R. Circle Campus</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
