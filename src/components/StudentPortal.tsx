import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  Heart,
  Clock,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Tag,
  Star,
  Send,
  Leaf,
  Flame,
  ArrowRight,
  MapPin,
  QrCode,
} from 'lucide-react';
import {
  MenuItem,
  Order,
  CartItem,
  CanteenConfig,
  Review,
  PaymentMethod,
  FoodCategory,
} from '../types';
import { createOrder, addReview } from '../services/db';
import { soundService } from '../services/sound';
import { useAuth } from '../context/AuthContext';
import { OrderTracker } from './OrderTracker';

interface StudentPortalProps {
  menu: MenuItem[];
  orders: Order[];
  config: CanteenConfig;
  reviews: Review[];
  isKannada?: boolean;
  onOpenUpiModal: (order: Order) => void;
  onOpenLogin: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  menu,
  orders,
  config,
  reviews,
  isKannada = false,
  onOpenUpiModal,
  onOpenLogin,
}) => {
  const { currentUser, userProfile } = useAuth();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('All');
  const [priceFilter, setPriceFilter] = useState<'all' | 'under30' | 'under50' | '50plus'>('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [favourites, setFavourites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('uvce_favourites') || '[]');
    } catch {
      return [];
    }
  });

  // Cart State
  const [cart, setCart] = useState<Record<string, number>>({});
  const [studentName, setStudentName] = useState(userProfile?.displayName || '');
  const [studentUsn, setStudentUsn] = useState(userProfile?.usn || '');
  const [studentPhone, setStudentPhone] = useState(userProfile?.phone || '');
  const [pickupTime, setPickupTime] = useState('ASAP');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Online UPI');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Review Form State
  const [reviewItem, setReviewItem] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Sync profile data into cart input when logged in
  useEffect(() => {
    if (userProfile?.displayName && !studentName) {
      setStudentName(userProfile.displayName);
    }
    if (userProfile?.usn && !studentUsn) {
      setStudentUsn(userProfile.usn);
    }
  }, [userProfile]);

  const toggleFavourite = (id: string) => {
    const next = favourites.includes(id)
      ? favourites.filter(x => x !== id)
      : [...favourites, id];
    setFavourites(next);
    localStorage.setItem('uvce_favourites', JSON.stringify(next));
    soundService.playChime();
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    soundService.playChime();
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const next = { ...prev };
      const current = next[id] || 0;
      if (current + delta <= 0) {
        delete next[id];
      } else {
        next[id] = current + delta;
      }
      return next;
    });
  };

  // Cart calculations
  const cartItemIds = Object.keys(cart);
  const cartTotalItems = cartItemIds.reduce((sum, id) => sum + (cart[id] || 0), 0);
  const subtotal = cartItemIds.reduce((sum, id) => {
    const item = menu.find(m => m.id === id);
    return sum + (item ? item.price * (cart[id] || 0) : 0);
  }, 0);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (code === 'UVCE10' && subtotal > 0) {
      const disc = Math.min(25, Math.round(subtotal * 0.1));
      setDiscount(disc);
      setAppliedCoupon('UVCE10');
      soundService.playChime();
    } else if (code === 'FRESHER' && subtotal >= 50) {
      setDiscount(15);
      setAppliedCoupon('FRESHER');
      soundService.playChime();
    } else {
      setDiscount(0);
      setAppliedCoupon(null);
      alert('Invalid coupon code or minimum order not met. Try UVCE10.');
    }
  };

  const finalTotal = Math.max(0, subtotal - discount);

  // Place Order
  const handlePlaceOrder = async () => {
    if (cartTotalItems === 0) {
      alert('Your cart is empty! Select some delicious campus food first.');
      return;
    }
    const finalName = studentName.trim() || userProfile?.displayName || 'UVCE Student';
    const finalUid = currentUser ? currentUser.uid : userProfile?.uid || 'guest_' + Date.now();

    setIsPlacingOrder(true);
    try {
      const orderItems = cartItemIds.map(id => {
        const item = menu.find(m => m.id === id)!;
        return {
          id: item.id,
          name: item.name,
          price: item.price,
          qty: cart[id],
          emoji: item.emoji,
        };
      });

      const orderId = 'UV' + Math.floor(100000 + Math.random() * 900000);
      const tokenNumber = Math.floor(1 + Math.random() * 99);

      const newOrder: Order = {
        id: orderId,
        studentUid: finalUid,
        studentName: finalName,
        studentEmail: currentUser?.email || undefined,
        studentUsn: studentUsn.trim() || undefined,
        studentPhone: studentPhone.trim() || undefined,
        items: orderItems,
        subtotal,
        discount,
        couponCode: appliedCoupon || undefined,
        total: finalTotal,
        paymentMethod,
        paymentStatus:
          paymentMethod === 'Online UPI'
            ? 'Payment Pending'
            : paymentMethod === 'UPI at counter'
            ? 'Pay on collection'
            : 'Pay on collection',
        pickupTime,
        status: 'Order Placed',
        tokenNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createOrder(newOrder);

      // Celebrate
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
      soundService.playChime();

      // Clear cart
      setCart({});
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponInput('');

      // If Online UPI, trigger UPI Modal automatically!
      if (paymentMethod === 'Online UPI') {
        onOpenUpiModal(newOrder);
      }

      // Scroll smoothly to order tracking
      const trackerEl = document.getElementById('studentOrdersSection');
      if (trackerEl) {
        trackerEl.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Order creation error:', err);
      alert('Failed to place order. Please check network and try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleReorder = (order: Order) => {
    const nextCart: Record<string, number> = {};
    order.items.forEach(i => {
      nextCart[i.id] = (nextCart[i.id] || 0) + i.qty;
    });
    setCart(nextCart);
    soundService.playChime();
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  // Review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem.trim() || !reviewFeedback.trim()) {
      alert('Please enter the food item and your review.');
      return;
    }
    const finalUid = currentUser ? currentUser.uid : userProfile?.uid || 'guest_' + Date.now();
    const finalName = studentName.trim() || userProfile?.displayName || 'UVCE Student';

    setIsSubmittingReview(true);
    try {
      await addReview({
        studentUid: finalUid,
        studentName: finalName,
        item: reviewItem.trim(),
        rating: reviewRating,
        feedback: reviewFeedback.trim(),
        createdAt: new Date().toISOString(),
      });
      setReviewItem('');
      setReviewFeedback('');
      soundService.playChime();
      alert('Thank you for rating your campus food experience!');
    } catch (err) {
      console.error('Review submit err:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filter menu items
  const categories: FoodCategory[] = [
    'All',
    'Sandwiches',
    'Burgers',
    'South Indian',
    'Snacks',
    'Drinks',
    'Meals',
    'Specials',
  ];

  const filteredMenu = menu.filter(m => {
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.nameKn && m.nameKn.includes(searchQuery)) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice =
      priceFilter === 'all' ||
      (priceFilter === 'under30' && m.price < 30) ||
      (priceFilter === 'under50' && m.price < 50) ||
      (priceFilter === '50plus' && m.price >= 50);
    const matchesVeg = !vegOnly || m.isVeg;
    const matchesFavourites = !favouritesOnly || favourites.includes(m.id);

    return matchesCategory && matchesSearch && matchesPrice && matchesVeg && matchesFavourites;
  });

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-[#8f161c] via-[#d42d32] to-[#f05a47] rounded-3xl text-white p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
          <div className="md:col-span-2 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-black uppercase tracking-wider border border-white/30">
              <MapPin className="w-3.5 h-3.5" /> UVCE · K.R. Circle Campus
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {isKannada ? (
                <>ನಿಮ್ಮ ಕ್ಯಾಂಪಸ್.<br />ನಿಮ್ಮ ಆಹಾರ. ನಿಮ್ಮ ಸಮಯ.</>
              ) : (
                <>Your campus.<br />Your cravings. Your time.</>
              )}
            </h1>
            <p className="text-rose-100 text-xs sm:text-sm max-w-xl leading-relaxed">
              {isKannada
                ? 'ನಂದಿನಿ ಕ್ಯಾಂಟೀನ್‌ನಿಂದ ನೇರವಾಗಿ ಆರ್ಡರ್ ಮಾಡಿ, ಸರದಿಯನ್ನು ತಪ್ಪಿಸಿ, ನಿಮ್ಮ ಟೋಕನ್ ಕರೆಯುವಾಗ ಬಿಸಿ ಆಹಾರವನ್ನು ಪಡೆದುಕೊಳ್ಳಿ.'
                : 'Order directly from Nandini Canteen, skip the campus crowd, pay via real UPI, and collect with your live digital pickup token.'}
            </p>
          </div>

          <div className="hidden md:flex justify-center items-center text-7xl lg:text-8xl select-none filter drop-shadow-xl animate-pulse">
            🍔🥪
          </div>
        </div>
      </div>

      {/* Live Campus Announcement Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#c9272c] flex items-center justify-center text-xl shrink-0">
              📢
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#c9272c] block">
                Canteen Live Notice
              </span>
              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                {isKannada && config.announcementKn ? config.announcementKn : config.announcement}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Prep Time: {config.prepTime}
            </span>
            {!config.isOpen && (
              <span className="text-xs bg-red-500 text-white font-extrabold px-3 py-1.5 rounded-xl">
                Canteen Closed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Welcome Bar & Quick Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
            <span>👋 {userProfile ? userProfile.displayName : 'Welcome to UVCE Eats'}</span>
            {userProfile?.usn && (
              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">
                {userProfile.usn}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 block">
            {userProfile
              ? 'Student account synced with online database'
              : 'Sign in to save favourites and track past order history'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!userProfile && (
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 bg-red-50 dark:bg-red-950/50 text-[#c9272c] hover:bg-red-100 border border-red-200 dark:border-red-900 rounded-xl text-xs font-extrabold transition-all"
            >
              🔐 Student Login
            </button>
          )}

          <button
            onClick={() => setFavouritesOnly(!favouritesOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 border ${
              favouritesOnly
                ? 'bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950 dark:border-rose-800'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${favouritesOnly ? 'fill-rose-500 text-rose-500' : ''}`} />
            Favourites ({favourites.length})
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('studentOrdersSection');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-extrabold hover:bg-gray-50 flex items-center gap-1"
          >
            📜 Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* Search, Veg Toggle & Price Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              isKannada
                ? 'ದೋಸೆ, ಸ್ಯಾಂಡ್‌ವಿಚ್, ಚಹಾ ಹುಡುಕಿ...'
                : 'Search sandwiches, burgers, dosas, snacks, tea...'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
          />
        </div>

        {/* Veg Pill */}
        <button
          onClick={() => setVegOnly(!vegOnly)}
          className={`px-3.5 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
            vegOnly
              ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Veg Only
        </button>

        {/* Price Filter */}
        <select
          value={priceFilter}
          onChange={e => setPriceFilter(e.target.value as any)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl px-3.5 py-3 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
        >
          <option value="all">All Prices</option>
          <option value="under30">Under ₹30</option>
          <option value="under50">Under ₹50</option>
          <option value="50plus">₹50 and above</option>
        </select>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? 'bg-[#c9272c] border-[#c9272c] text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main 2-column layout: Menu Grid (Left) + Cart Aside (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Menu Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg sm:text-xl text-gray-900 dark:text-white">
              {isKannada ? 'ಕ್ಯಾಂಪಸ್ ಮೆನು' : 'Campus Canteen Menu'}
            </h2>
            <span className="text-xs text-gray-500 font-bold">
              {filteredMenu.length} items available
            </span>
          </div>

          {filteredMenu.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-10 text-center text-gray-500">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="font-extrabold text-sm">No matching food items found.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setPriceFilter('all');
                  setVegOnly(false);
                  setFavouritesOnly(false);
                }}
                className="mt-3 text-xs font-bold text-[#c9272c] hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMenu.map(item => {
                const isFav = favourites.includes(item.id);
                const inCartQty = cart[item.id] || 0;

                return (
                  <article
                    key={item.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Emoji Banner */}
                      <div className="h-32 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-stone-900 dark:to-neutral-800 flex items-center justify-center text-6xl relative select-none">
                        <span>{item.emoji || '🍽️'}</span>
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          {item.isVeg && (
                            <span className="bg-white/90 dark:bg-black/80 backdrop-blur-xs text-emerald-700 dark:text-emerald-400 font-black text-[10px] px-2 py-0.5 rounded-md border border-emerald-500/30">
                              VEG
                            </span>
                          )}
                          {item.isPopular && (
                            <span className="bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                              POPULAR
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => toggleFavourite(item.id)}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center text-gray-400 hover:text-red-500 shadow-xs transition-colors"
                          title="Save to favourites"
                        >
                          <Heart
                            className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Card Content */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                              {isKannada && item.nameKn ? item.nameKn : item.name}
                            </h3>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                              {item.category}
                            </span>
                          </div>
                          <div className="text-base sm:text-lg font-black text-[#c9272c]">
                            ₹{item.price}
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed min-h-[36px]">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="p-4 pt-0">
                      {inCartQty > 0 ? (
                        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/40 rounded-2xl p-1 border border-red-200 dark:border-red-900">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 text-[#c9272c] font-black flex items-center justify-center shadow-xs"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-black text-sm text-[#c9272c]">
                            {inCartQty} in cart
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-8 h-8 rounded-xl bg-[#c9272c] text-white font-black flex items-center justify-center shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!item.available}
                          className="w-full bg-[#c9272c] hover:bg-[#a91e24] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-2.5 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{item.available ? 'Add to Cart' : 'Out of Stock'}</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Aside */}
        <aside className="space-y-4 sticky top-20">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#c9272c]" />
                <span>{isKannada ? 'ನಿಮ್ಮ ಕಾರ್ಟ್' : 'Your Cart'}</span>
              </h3>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-[#c9272c]">
                {cartTotalItems} items
              </span>
            </div>

            {/* Cart Items List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800 my-3 max-h-56 overflow-y-auto pr-1">
              {cartItemIds.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  <div className="text-3xl mb-1">🛒</div>
                  Your cart is empty. Add a snack to get started!
                </div>
              ) : (
                cartItemIds.map(id => {
                  const m = menu.find(x => x.id === id);
                  if (!m) return null;
                  return (
                    <div key={id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-xs text-gray-900 dark:text-white">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-gray-400">₹{m.price} each</div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => updateQty(id, -1)}
                            className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-black">{cart[id]}</span>
                          <button
                            onClick={() => updateQty(id, 1)}
                            className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="font-black text-xs font-mono text-gray-900 dark:text-white">
                        ₹{m.price * cart[id]}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Subtotal & Discount */}
            <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-mono">₹{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon ({appliedCoupon})</span>
                  <span className="font-mono">- ₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-1">
                <span>Total Amount</span>
                <span className="text-[#c9272c] font-mono text-base">₹{finalTotal}</span>
              </div>
            </div>

            {/* Inputs & Checkout */}
            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shashank C"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* USN */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  USN / Student ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1UV24CS088"
                  value={studentUsn}
                  onChange={e => setStudentUsn(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 outline-none focus:ring-2 focus:ring-red-500 font-mono uppercase"
                />
              </div>

              {/* Pickup Time */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  ⏰ Desired Pickup Time
                </label>
                <select
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="ASAP">As soon as possible (~10m)</option>
                  <option value="In 10 minutes">In 10 minutes (Next Break)</option>
                  <option value="In 15 minutes">In 15 minutes</option>
                  <option value="In 20 minutes">In 20 minutes</option>
                  <option value="In 30 minutes">In 30 minutes (After Class)</option>
                </select>
              </div>

              {/* Coupon */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  🎟️ Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Try UVCE10"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value)}
                    className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 font-mono uppercase outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={applyCoupon}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-extrabold rounded-xl transition-colors"
                  >
                    Apply
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Use code <code>UVCE10</code> for 10% off.
                </span>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Choose Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Online UPI">⚡ Real Online UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Pay at counter">💵 Cash at counter</option>
                  <option value="UPI at counter">📱 Scan Canteen UPI QR at counter</option>
                  <option value="Debit/Credit card">💳 Card at counter</option>
                </select>
              </div>

              {/* Payment Info Note */}
              <div
                className={`p-3 rounded-2xl text-xs ${
                  paymentMethod === 'Online UPI'
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300 border border-red-200 dark:border-red-900'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                }`}
              >
                {paymentMethod === 'Online UPI' ? (
                  <span>
                    ⚡ <strong>Instant Real UPI:</strong> Generates dynamic QR code and 1-tap mobile deep link to GPay / PhonePe. Enter your 12-digit UTR to confirm priority preparation!
                  </span>
                ) : (
                  <span>
                    💵 <strong>Pay on Collection:</strong> Pay in cash or scan the verified canteen QR code when you pick up at Nandini Canteen.
                  </span>
                )}
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || cartTotalItems === 0}
                className="w-full bg-[#c9272c] hover:bg-[#a91e24] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 px-4 rounded-2xl text-sm transition-all shadow-md shadow-red-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isPlacingOrder ? (
                  <span>Creating Token...</span>
                ) : (
                  <>
                    <span>Place Pickup Order (₹{finalTotal})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Live Order Tracking Section */}
      <section id="studentOrdersSection" className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-xl text-gray-900 dark:text-white flex items-center gap-2">
              <span>📦 Live Order Tracking & Pickup Tokens</span>
            </h2>
            <p className="text-xs text-gray-500">
              Real-time Firestore live updates: Canteen updates will reflect here with sound alerts!
            </p>
          </div>
        </div>

        <OrderTracker
          orders={orders}
          onOpenUpiModal={onOpenUpiModal}
          onReorder={handleReorder}
          isKannada={isKannada}
        />
      </section>

      {/* Ratings and Reviews Section */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xs">
        <h2 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Rate Your Campus Food Experience
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleSubmitReview} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Food Item (e.g. Masala Dosa, Veg Burger)
              </label>
              <input
                type="text"
                placeholder="e.g. Cheese Sandwich"
                value={reviewItem}
                onChange={e => setReviewItem(e.target.value)}
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-1 text-2xl transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= reviewRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 dark:text-gray-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Feedback
              </label>
              <textarea
                rows={2}
                placeholder="Share your experience (crispy, hot, quick service, etc.)..."
                value={reviewFeedback}
                onChange={e => setReviewFeedback(e.target.value)}
                className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingReview}
              className="bg-[#c9272c] hover:bg-[#a91e24] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Submit Review
            </button>
          </form>

          {/* Reviews List */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-gray-700 dark:text-gray-300">
              Recent Campus Reviews ({reviews.length})
            </h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto pr-1">
              {reviews.length === 0 ? (
                <p className="text-xs text-gray-400 py-4">No reviews yet. Be the first to rate!</p>
              ) : (
                reviews.slice(0, 6).map(r => (
                  <div key={r.id} className="py-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="font-bold text-gray-900 dark:text-white">{r.item}</strong>
                      <div className="flex text-amber-400 text-xs">
                        {'★'.repeat(r.rating)}
                        <span className="text-gray-300 dark:text-gray-700">
                          {'★'.repeat(5 - r.rating)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">"{r.feedback}"</p>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      — {r.studentName} • {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
