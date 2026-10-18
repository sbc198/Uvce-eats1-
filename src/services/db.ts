import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MenuItem, Order, CanteenConfig, Review, OrderStatus, PaymentStatus } from '../types';

export const INITIAL_MENU_ITEMS: Omit<MenuItem, 'updatedAt'>[] = [
  {
    id: 'm1',
    name: 'Veg Grilled Sandwich',
    nameKn: 'ತರಕಾರಿ ಗ್ರಿಲ್ಡ್ ಸ್ಯಾಂಡ್‌ವಿಚ್',
    price: 45,
    category: 'Sandwiches',
    emoji: '🥪',
    available: true,
    desc: 'Fresh garden vegetables layered with mint chutney and toasted bread.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 8,
  },
  {
    id: 'm2',
    name: 'Cheese Corn Sandwich',
    nameKn: 'ಚೀಸ್ ಕಾರ್ನ್ ಸ್ಯಾಂಡ್‌ವಿಚ್',
    price: 65,
    category: 'Sandwiches',
    emoji: '🧀',
    available: true,
    desc: 'Loaded melted mozzarella and sweet corn toasted with herb butter.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 10,
  },
  {
    id: 'm3',
    name: 'Crispy Veg Burger',
    nameKn: 'ವೆಜ್ ಬರ್ಗರ್',
    price: 55,
    category: 'Burgers',
    emoji: '🍔',
    available: true,
    desc: 'Golden potato patty with creamy mayo, tomato, lettuce & soft sesame bun.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 10,
  },
  {
    id: 'm4',
    name: 'Cheese Overload Burger',
    nameKn: 'ಚೀಸ್ ಬರ್ಗರ್',
    price: 75,
    category: 'Burgers',
    emoji: '🍔',
    available: true,
    desc: 'Juicy spiced veg patty topped with double molten cheese slices.',
    isVeg: true,
    isPopular: false,
    prepTimeMinutes: 12,
  },
  {
    id: 'm5',
    name: 'UVCE Special Masala Dosa',
    nameKn: 'ಮಸಾಲೆ ದೋಸೆ',
    price: 50,
    category: 'South Indian',
    emoji: '🥞',
    available: true,
    desc: 'Crispy butter roast dosa with spicy red chutney and spiced aloo palya.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 7,
  },
  {
    id: 'm6',
    name: 'Button Idli Vada Combo',
    nameKn: 'ಇಡ್ಲಿ ವಡೆ ಕಾಂಬೊ',
    price: 40,
    category: 'South Indian',
    emoji: '🥟',
    available: true,
    desc: '2 steaming soft idlis with crispy medu vada, fresh coconut chutney & hot sambar.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 5,
  },
  {
    id: 'm7',
    name: 'Hot Crispy Samosa (2 pcs)',
    nameKn: 'ಸಮೋಸ (೨ ತುಂಡು)',
    price: 25,
    category: 'Snacks',
    emoji: '🥟',
    available: true,
    desc: 'Flaky pastry stuffed with spiced potatoes and green peas with tangy tamarind chutney.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 3,
  },
  {
    id: 'm8',
    name: 'Peri-Peri French Fries',
    nameKn: 'ಫ್ರೆಂಚ್ ಫ್ರೈಸ್',
    price: 60,
    category: 'Snacks',
    emoji: '🍟',
    available: true,
    desc: 'Golden crisp crinkle cut potato fries tossed in spicy peri-peri seasoning.',
    isVeg: true,
    isPopular: false,
    prepTimeMinutes: 8,
  },
  {
    id: 'm9',
    name: 'Nandini Filter Coffee',
    nameKn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ',
    price: 15,
    category: 'Drinks',
    emoji: '☕',
    available: true,
    desc: 'Traditional South Indian frothy filter brew made with pure Nandini milk.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 3,
  },
  {
    id: 'm10',
    name: 'Ginger Cardamom Masala Tea',
    nameKn: 'ಶುಂಠಿ ಚಹಾ',
    price: 15,
    category: 'Drinks',
    emoji: '🫖',
    available: true,
    desc: 'Strong brewed campus chai infused with fresh crushed ginger and cardamom.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 3,
  },
  {
    id: 'm11',
    name: 'Fresh Mint Lime Juice',
    nameKn: 'ನಿಂಬೆ ರಸ',
    price: 30,
    category: 'Drinks',
    emoji: '🥤',
    available: true,
    desc: 'Chilled freshly squeezed lime with garden mint leaves and rock salt.',
    isVeg: true,
    isPopular: false,
    prepTimeMinutes: 4,
  },
  {
    id: 'm12',
    name: 'Veg Hakka Noodles',
    nameKn: 'ವೆಜ್ ನೂಡಲ್ಸ್',
    price: 75,
    category: 'Meals',
    emoji: '🍜',
    available: true,
    desc: 'Wok tossed noodles with crunchy cabbage, bell peppers, carrots and spring onions.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 12,
  },
  {
    id: 'm13',
    name: 'Vegetable Fried Rice',
    nameKn: 'ಫ್ರೈಡ್ ರೈಸ್',
    price: 75,
    category: 'Meals',
    emoji: '🍚',
    available: true,
    desc: 'Basmati rice tossed with fresh seasonal veggies, soy and oriental aromatic spices.',
    isVeg: true,
    isPopular: false,
    prepTimeMinutes: 12,
  },
  {
    id: 'm14',
    name: 'Mangalore Buns (2 pcs)',
    nameKn: 'ಮಂಗಳೂರು ಬನ್ಸ್',
    price: 35,
    category: 'Specials',
    emoji: '🥯',
    available: true,
    desc: 'Sweet, fluffy banana puris served hot with spicy coconut chutney.',
    isVeg: true,
    isPopular: true,
    prepTimeMinutes: 5,
  },
];

export const DEFAULT_CANTEEN_CONFIG: CanteenConfig = {
  announcement: 'Welcome to UVCE Eats! Hot Filter Coffee & Dosa ready in 5 mins at Nandini Canteen.',
  announcementKn: 'ಯುವಿಸಿಇ ಈಟ್ಸ್‌ಗೆ ಸ್ವಾಗತ! ನಂದಿನಿ ಕ್ಯಾಂಟೀನ್‌ನಲ್ಲಿ ಬಿಸಿ ಫಿಲ್ಟರ್ ಕಾಫಿ & ದೋಸೆ ಲಭ್ಯವಿದೆ.',
  prepTime: '10-15 mins',
  isOpen: true,
  upiVpa: 'uvceeats@okaxis',
  upiPayeeName: 'UVCE Campus Canteen',
  canteenLocation: 'Nandini Canteen & Mechanical Block Quadrangle, UVCE',
  demoPin: '1234',
};

// Seed menu and config on start if empty
export async function seedCanteenDataIfEmpty() {
  const configPath = 'canteen_config/default';
  try {
    const configSnap = await getDoc(doc(db, 'canteen_config', 'default'));
    if (!configSnap.exists()) {
      await setDoc(doc(db, 'canteen_config', 'default'), {
        ...DEFAULT_CANTEEN_CONFIG,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Config seed handled:', err);
  }

  const menuPath = 'menu';
  try {
    const menuSnap = await getDocs(collection(db, menuPath));
    if (menuSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_MENU_ITEMS.forEach(item => {
        const itemRef = doc(db, 'menu', item.id);
        batch.set(itemRef, {
          ...item,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      console.log('Successfully seeded UVCE canteen menu in Firestore');
    }
  } catch (err) {
    console.warn('Menu seed handled:', err);
  }
}

// Subscribe to menu items
export function subscribeToMenu(onData: (items: MenuItem[]) => void): Unsubscribe {
  const path = 'menu';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const items: MenuItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as MenuItem);
      });
      if (items.length === 0) {
        onData(INITIAL_MENU_ITEMS as MenuItem[]);
      } else {
        onData(items);
      }
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Subscribe to canteen configuration
export function subscribeToCanteenConfig(onData: (config: CanteenConfig) => void): Unsubscribe {
  const path = 'canteen_config/default';
  return onSnapshot(
    doc(db, 'canteen_config', 'default'),
    docSnap => {
      if (docSnap.exists()) {
        onData(docSnap.data() as CanteenConfig);
      } else {
        onData(DEFAULT_CANTEEN_CONFIG);
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Update canteen configuration (Admin)
export async function updateCanteenConfig(updates: Partial<CanteenConfig>) {
  const path = 'canteen_config/default';
  try {
    await updateDoc(doc(db, 'canteen_config', 'default'), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Toggle menu item availability (Admin)
export async function toggleMenuItemAvailability(id: string, currentAvailable: boolean) {
  const path = `menu/${id}`;
  try {
    await updateDoc(doc(db, 'menu', id), {
      available: !currentAvailable,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Add new menu item (Admin)
export async function addMenuItem(item: Omit<MenuItem, 'id'>) {
  const newId = 'm_' + Date.now();
  const path = `menu/${newId}`;
  try {
    await setDoc(doc(db, 'menu', newId), {
      ...item,
      id: newId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Update menu item price or details (Admin)
export async function updateMenuItem(id: string, updates: Partial<MenuItem>) {
  const path = `menu/${id}`;
  try {
    await updateDoc(doc(db, 'menu', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Subscribe to student's own orders
export function subscribeToStudentOrders(studentUid: string, onData: (orders: Order[]) => void): Unsubscribe {
  const path = 'orders';
  const q = query(
    collection(db, path),
    where('studentUid', '==', studentUid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    snapshot => {
      const orders: Order[] = [];
      snapshot.forEach(docSnap => {
        orders.push({ ...docSnap.data() } as Order);
      });
      onData(orders);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Subscribe to ALL orders (Admin Dashboard)
export function subscribeToAllOrders(onData: (orders: Order[]) => void): Unsubscribe {
  const path = 'orders';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    snapshot => {
      const orders: Order[] = [];
      snapshot.forEach(docSnap => {
        orders.push({ ...docSnap.data() } as Order);
      });
      onData(orders);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Create a new order
export async function createOrder(order: Order): Promise<void> {
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), {
      ...order,
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Update order status (Admin)
export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) {
  const path = `orders/${orderId}`;
  try {
    const payload: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (paymentStatus) {
      payload.paymentStatus = paymentStatus;
    }
    await updateDoc(doc(db, 'orders', orderId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Submit UPI Transaction UTR (Student)
export async function submitUpiTransactionId(orderId: string, utrNumber: string) {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      upiTransactionId: utrNumber,
      paymentStatus: 'UPI Submitted - Verification Pending',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Subscribe to Reviews
export function subscribeToReviews(onData: (reviews: Review[]) => void): Unsubscribe {
  const path = 'reviews';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    snapshot => {
      const reviews: Review[] = [];
      snapshot.forEach(docSnap => {
        reviews.push({ id: docSnap.id, ...docSnap.data() } as Review);
      });
      onData(reviews);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Add a review
export async function addReview(review: Omit<Review, 'id'>) {
  const id = 'rev_' + Date.now();
  const path = `reviews/${id}`;
  try {
    await setDoc(doc(db, 'reviews', id), {
      ...review,
      id,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
