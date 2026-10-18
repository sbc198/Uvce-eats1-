import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Plus,
  Eye,
  EyeOff,
  Flame,
  Volume2,
  DollarSign,
  TrendingUp,
  PackageCheck,
  ShoppingBag,
  Send,
  Lock,
  Unlock,
  RefreshCw,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { MenuItem, Order, CanteenConfig, OrderStatus, FoodCategory } from '../types';
import {
  updateOrderStatus,
  toggleMenuItemAvailability,
  addMenuItem,
  updateMenuItem,
  updateCanteenConfig,
} from '../services/db';
import { soundService } from '../services/sound';
import { useAuth } from '../context/AuthContext';

interface AdminPortalProps {
  orders: Order[];
  menu: MenuItem[];
  config: CanteenConfig;
  isKannada?: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  orders,
  menu,
  config,
  isKannada = false,
}) => {
  const { isAdmin, ownerPinUnlocked, unlockOwnerWithPin, setOwnerPinUnlocked } = useAuth();
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'canteen' | 'analytics'>('orders');
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'ready' | 'collected'>('active');

  // New menu item form state
  const [newName, setNewName] = useState('');
  const [newNameKn, setNewNameKn] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState<FoodCategory>('Sandwiches');
  const [newEmoji, setNewEmoji] = useState('🥪');
  const [newDesc, setNewDesc] = useState('');
  const [newIsVeg, setNewIsVeg] = useState(true);

  // Announcement state
  const [announcementText, setAnnouncementText] = useState(config.announcement || '');
  const [selectedPrepTime, setSelectedPrepTime] = useState(config.prepTime || '10-15 mins');
  const [upiVpaInput, setUpiVpaInput] = useState(config.upiVpa || 'uvceeats@okaxis');
  const [canteenIsOpen, setCanteenIsOpen] = useState(config.isOpen ?? true);

  // Track new orders to sound kitchen chime
  const [prevOrdersCount, setPrevOrdersCount] = useState(orders.length);
  useEffect(() => {
    if (orders.length > prevOrdersCount) {
      soundService.playKitchenOrderDing();
    }
    setPrevOrdersCount(orders.length);
  }, [orders.length, prevOrdersCount]);

  useEffect(() => {
    setAnnouncementText(config.announcement);
    setSelectedPrepTime(config.prepTime);
    setUpiVpaInput(config.upiVpa);
    setCanteenIsOpen(config.isOpen);
  }, [config]);

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockOwnerWithPin(pinInput)) {
      setPinError('');
      soundService.playChime();
    } else {
      setPinError('Invalid PIN. Use default demo PIN: 1234');
    }
  };

  // Status updates
  const handleAdvanceStatus = async (order: Order, nextStatus: OrderStatus) => {
    soundService.playChime();
    let paymentUpdate = undefined;
    if (nextStatus === 'Ready for Pickup') {
      soundService.playReadyAlert();
    }
    if (nextStatus === 'Collected' && order.paymentMethod === 'Pay at counter') {
      paymentUpdate = 'Paid on collection' as any;
    }
    await updateOrderStatus(order.id, nextStatus, paymentUpdate);
  };

  const handleVerifyUpi = async (orderId: string) => {
    soundService.playChime();
    await updateOrderStatus(orderId, 'Accepted', 'UPI Paid - Verified');
  };

  // Menu updates
  const handleToggleMenu = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, item.available);
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice || Number(newPrice) <= 0) {
      alert('Please enter a valid food name and price.');
      return;
    }

    await addMenuItem({
      name: newName.trim(),
      nameKn: newNameKn.trim() || undefined,
      price: Number(newPrice),
      category: newCategory,
      emoji: newEmoji.trim() || '🍽️',
      available: true,
      desc: newDesc.trim() || 'Freshly prepared at UVCE campus canteen.',
      isVeg: newIsVeg,
      prepTimeMinutes: 10,
    });

    setNewName('');
    setNewNameKn('');
    setNewPrice('');
    setNewDesc('');
    soundService.playChime();
    alert('Menu item added successfully!');
  };

  const handleSaveConfig = async () => {
    await updateCanteenConfig({
      announcement: announcementText,
      prepTime: selectedPrepTime,
      upiVpa: upiVpaInput,
      isOpen: canteenIsOpen,
    });
    soundService.playChime();
    alert('Canteen settings updated live for all campus students!');
  };

  // Export orders to CSV
  const handleExportCSV = () => {
    if (!orders.length) {
      alert('No orders available to export.');
      return;
    }

    const headers = [
      'Order ID',
      'Token No',
      'Student Name',
      'USN',
      'Phone',
      'Items',
      'Total (INR)',
      'Payment Method',
      'Payment Status',
      'UPI UTR No',
      'Order Status',
      'Pickup Time',
      'Date & Time',
    ];

    const rows = orders.map(o => [
      o.id,
      `#${o.tokenNumber}`,
      `"${o.studentName}"`,
      o.studentUsn || 'N/A',
      o.studentPhone || 'N/A',
      `"${o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}"`,
      o.total,
      o.paymentMethod,
      o.paymentStatus,
      o.upiTransactionId || 'N/A',
      o.status,
      o.pickupTime,
      new Date(o.createdAt).toLocaleString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UVCE_Eats_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
  const todaySales = todayOrders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.total : 0), 0);
  const activeOrders = orders.filter(o => o.status !== 'Collected' && o.status !== 'Cancelled');
  const readyOrders = orders.filter(o => o.status === 'Ready for Pickup');

  const itemCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      itemCounts[i.name] = (itemCounts[i.name] || 0) + i.qty;
    });
  });
  const mostPopular = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

  // Orders filtering
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'active') return o.status !== 'Collected' && o.status !== 'Cancelled';
    if (orderFilter === 'ready') return o.status === 'Ready for Pickup';
    if (orderFilter === 'collected') return o.status === 'Collected';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-neutral-900 to-red-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-black uppercase tracking-wider mb-2 border border-red-500/30">
              <ChefHat className="w-3.5 h-3.5" /> Kitchen & Counter Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Canteen Owner & Staff Dashboard
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-xl">
              Accept orders, update live preparation stages, verify UPI payments, and manage menu stock in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => soundService.playKitchenOrderDing()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10"
              title="Test chime sound"
            >
              <Volume2 className="w-4 h-4 text-amber-300" /> Test Bell
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#c9272c] hover:bg-[#a91e24] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Staff PIN Gate if not admin */}
      {!isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xl shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                Owner Access Verification
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Enter Canteen PIN (Default: <code className="font-mono font-bold bg-white dark:bg-black px-1.5 py-0.5 rounded text-amber-800">1234</code>) or sign in with admin Google account (shashank08c@gmail.com).
              </p>
              <form onSubmit={handleUnlockPin} className="mt-3 flex gap-2 max-w-sm">
                <input
                  type="password"
                  placeholder="Enter PIN (1234)"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  className="flex-1 text-sm bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" /> Unlock
                </button>
              </form>
              {pinError && <p className="text-xs font-bold text-red-600 mt-1">{pinError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-extrabold uppercase">Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            ₹{todaySales.toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-400">{todayOrders.length} orders today</span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-extrabold uppercase">Active Orders</span>
            <ChefHat className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#c9272c]">{activeOrders.length}</div>
          <span className="text-[11px] text-gray-400">Needs kitchen prep</span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-extrabold uppercase">Ready for Pickup</span>
            <Bell className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{readyOrders.length}</div>
          <span className="text-[11px] text-gray-400">Waiting at counter</span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-extrabold uppercase">Top Canteen Item</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-base font-black truncate text-gray-900 dark:text-white">
            {mostPopular ? mostPopular[0] : 'Masala Dosa'}
          </div>
          <span className="text-[11px] text-gray-400">
            {mostPopular ? `${mostPopular[1]} plates sold` : 'High demand'}
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-2 text-xs sm:text-sm font-extrabold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-[#c9272c] text-[#c9272c]'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Live Orders ({activeOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-3 px-2 text-xs sm:text-sm font-extrabold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'menu'
              ? 'border-[#c9272c] text-[#c9272c]'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ChefHat className="w-4 h-4" /> Menu Manager ({menu.length})
        </button>

        <button
          onClick={() => setActiveTab('canteen')}
          className={`pb-3 px-2 text-xs sm:text-sm font-extrabold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'canteen'
              ? 'border-[#c9272c] text-[#c9272c]'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" /> Canteen Broadcast & Settings
        </button>
      </div>

      {/* TAB 1: LIVE ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Subfilter */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
              <button
                onClick={() => setOrderFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  orderFilter === 'active'
                    ? 'bg-white dark:bg-gray-900 text-[#c9272c] shadow-xs'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Active Kitchen ({activeOrders.length})
              </button>
              <button
                onClick={() => setOrderFilter('ready')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  orderFilter === 'ready'
                    ? 'bg-white dark:bg-gray-900 text-emerald-600 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Ready for Pickup ({readyOrders.length})
              </button>
              <button
                onClick={() => setOrderFilter('collected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  orderFilter === 'collected'
                    ? 'bg-white dark:bg-gray-900 text-purple-600 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Collected
              </button>
              <button
                onClick={() => setOrderFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  orderFilter === 'all'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                All ({orders.length})
              </button>
            </div>

            <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin" /> Live Firestore sync
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-10 text-center text-gray-500">
              <PackageCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="font-bold text-sm">No orders matching this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrders.map(order => {
                const isReady = order.status === 'Ready for Pickup';
                const isCollected = order.status === 'Collected';

                return (
                  <div
                    key={order.id}
                    className={`bg-white dark:bg-gray-900 border rounded-3xl p-5 shadow-xs transition-all relative ${
                      isReady
                        ? 'border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-500/10'
                        : order.status === 'Preparing'
                        ? 'border-amber-300 dark:border-amber-800'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-red-100 dark:bg-red-950 text-[#c9272c]">
                            TOKEN #{order.tokenNumber}
                          </span>
                          <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                            #{order.id}
                          </h3>
                        </div>
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
                          👤 {order.studentName} {order.studentUsn ? `(${order.studentUsn})` : ''}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Pickup: {order.pickupTime}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black text-gray-900 dark:text-white block">
                          ₹{order.total}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isReady
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'Preparing'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'Accepted'
                              ? 'bg-blue-100 text-blue-800'
                              : isCollected
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="my-3 space-y-1.5 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl text-xs">
                      {order.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between font-semibold text-gray-800 dark:text-gray-200">
                          <span>
                            {i.emoji} {i.name} × <strong className="text-red-600 dark:text-red-400">{i.qty}</strong>
                          </span>
                          <span className="font-mono">₹{i.price * i.qty}</span>
                        </div>
                      ))}
                    </div>

                    {/* Payment Info & UPI verification */}
                    <div className="mb-4 text-xs bg-stone-50 dark:bg-stone-900/60 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                          {order.paymentMethod}
                        </span>
                        <div className="text-[11px] text-gray-500 font-semibold">
                          Status: {order.paymentStatus}
                        </div>
                        {order.upiTransactionId && (
                          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                            UPI UTR: {order.upiTransactionId}
                          </div>
                        )}
                      </div>

                      {order.paymentMethod === 'Online UPI' &&
                        order.paymentStatus !== 'UPI Paid - Verified' && (
                          <button
                            onClick={() => handleVerifyUpi(order.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Confirm UPI Paid
                          </button>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      {order.status === 'Order Placed' && (
                        <button
                          onClick={() => handleAdvanceStatus(order, 'Accepted')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all"
                        >
                          Accept Order
                        </button>
                      )}

                      {(order.status === 'Order Placed' || order.status === 'Accepted') && (
                        <button
                          onClick={() => handleAdvanceStatus(order, 'Preparing')}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all"
                        >
                          🍳 Start Cooking
                        </button>
                      )}

                      {order.status === 'Preparing' && (
                        <button
                          onClick={() => handleAdvanceStatus(order, 'Ready for Pickup')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-md transition-all animate-pulse"
                        >
                          🔔 Mark Ready (Token #{order.tokenNumber})
                        </button>
                      )}

                      {order.status === 'Ready for Pickup' && (
                        <button
                          onClick={() => handleAdvanceStatus(order, 'Collected')}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all"
                        >
                          ✓ Handed to Student (Collected)
                        </button>
                      )}

                      {isCollected && (
                        <span className="text-xs font-bold text-gray-400 py-1 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Completed & Handed Over
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MENU MANAGER */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items List */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-black text-gray-900 dark:text-white text-base flex items-center justify-between">
              <span>Current Canteen Items ({menu.length})</span>
              <span className="text-xs text-gray-500 font-normal">Click toggle to show/hide in student view</span>
            </h3>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden shadow-xs">
              {menu.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-2xl flex items-center justify-center shrink-0">
                      {item.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-extrabold text-gray-900 dark:text-white">
                          {item.name}
                        </strong>
                        {item.isVeg && (
                          <span className="text-[9px] font-black border border-emerald-600 text-emerald-600 px-1 rounded-sm">
                            VEG
                          </span>
                        )}
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-bold">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        ₹{item.price} • {item.desc}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        item.available
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                      }`}
                    >
                      {item.available ? 'Available' : 'Sold Out'}
                    </span>
                    <button
                      onClick={() => handleToggleMenu(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
                        item.available
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                          : 'bg-[#c9272c] hover:bg-[#a91e24] text-white'
                      }`}
                    >
                      {item.available ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {item.available ? 'Hide' : 'Make Live'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Item Form */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-xs">
            <h3 className="font-black text-gray-900 dark:text-white text-base mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#c9272c]" /> Add Item to Menu
            </h3>

            <form onSubmit={handleAddMenuItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Food Name (English)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Masala Dosa"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Name (Kannada - Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ಮಸಾಲೆ ದೋಸೆ"
                  value={newNameKn}
                  onChange={e => setNewNameKn(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="🥪"
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as FoodCategory)}
                  className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Sandwiches">Sandwiches</option>
                  <option value="Burgers">Burgers</option>
                  <option value="South Indian">South Indian</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Meals">Meals</option>
                  <option value="Specials">Specials</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Crispy roast with potato curry"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVegCheck"
                  checked={newIsVeg}
                  onChange={e => setNewIsVeg(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isVegCheck" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Vegetarian food item (Pure Veg)
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-[#c9272c] hover:bg-[#a91e24] text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.98] mt-2"
              >
                ＋ Publish Item to Live Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: CANTEEN BROADCAST & OPERATIONS */}
      {activeTab === 'canteen' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#c9272c]" /> Campus Announcement Banner
            </h3>
            <p className="text-xs text-gray-500">
              This message appears at the top of every UVCE student's screen in real time.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Announcement Text
              </label>
              <textarea
                rows={3}
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="e.g. Fresh Masala Dosa and Filter Coffee hot right now!"
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                ⏱️ Current Kitchen Preparation Estimate
              </label>
              <select
                value={selectedPrepTime}
                onChange={e => setSelectedPrepTime(e.target.value)}
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="5-8 mins">⚡ Express (5-8 mins)</option>
                <option value="10-15 mins">👍 Moderate (10-15 mins)</option>
                <option value="15-20 mins">🥪 Normal Rush (15-20 mins)</option>
                <option value="25-30 mins">🔥 Heavy Lunch Rush (25-30 mins)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div>
                <strong className="text-xs font-extrabold text-gray-900 dark:text-white block">
                  Canteen Open for Orders
                </strong>
                <span className="text-[11px] text-gray-500">
                  Switch off during canteen break or after closing hours
                </span>
              </div>
              <input
                type="checkbox"
                checked={canteenIsOpen}
                onChange={e => setCanteenIsOpen(e.target.checked)}
                className="w-5 h-5 text-red-600 rounded cursor-pointer"
              />
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full bg-[#c9272c] hover:bg-[#a91e24] text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.98]"
            >
              Update Broadcast & Settings
            </button>
          </div>

          {/* UPI Receiver Configuration */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" /> Canteen UPI Payment Setup
            </h3>
            <p className="text-xs text-gray-500">
              The UPI ID (VPA) where students send instant payments via GPay, PhonePe, and Paytm.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Canteen UPI VPA (ID)
              </label>
              <input
                type="text"
                value={upiVpaInput}
                onChange={e => setUpiVpaInput(e.target.value)}
                placeholder="e.g. uvceeats@okaxis or canteen@upi"
                className="w-full font-mono text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <strong>💡 How Real UPI Works:</strong> When a student places an order, UVCE Eats generates a dynamic QR code and direct Android/iOS deep link targeting <code>{upiVpaInput}</code>. Students submit their 12-digit transaction UTR number, and you can cross-verify in the "Live Orders" tab.
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.98]"
            >
              Save UPI Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
