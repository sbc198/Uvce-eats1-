export type UserRole = 'student' | 'owner' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  usn?: string;
  phone?: string;
  photoURL?: string;
  createdAt: string;
}

export type FoodCategory =
  | 'All'
  | 'Sandwiches'
  | 'Burgers'
  | 'South Indian'
  | 'Snacks'
  | 'Drinks'
  | 'Meals'
  | 'Specials';

export interface MenuItem {
  id: string;
  name: string;
  nameKn?: string;
  price: number;
  category: FoodCategory;
  emoji: string;
  available: boolean;
  desc: string;
  isVeg: boolean;
  isPopular?: boolean;
  prepTimeMinutes?: number;
  updatedAt?: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export type OrderStatus =
  | 'Order Placed'
  | 'Accepted'
  | 'Preparing'
  | 'Ready for Pickup'
  | 'Collected'
  | 'Cancelled';

export type PaymentMethod =
  | 'Online UPI'
  | 'Pay at counter'
  | 'UPI at counter'
  | 'Debit/Credit card'
  | 'Net banking';

export type PaymentStatus =
  | 'Pay on collection'
  | 'UPI Paid - Verified'
  | 'UPI Submitted - Verification Pending'
  | 'Payment Pending'
  | 'Paid Online';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  emoji: string;
}

export interface Order {
  id: string; // e.g., UV-84920
  studentUid: string;
  studentName: string;
  studentEmail?: string;
  studentUsn?: string;
  studentPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  upiTransactionId?: string;
  pickupTime: string;
  status: OrderStatus;
  tokenNumber: number;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanteenConfig {
  announcement: string;
  announcementKn?: string;
  prepTime: string;
  isOpen: boolean;
  upiVpa: string;
  upiPayeeName: string;
  canteenLocation: string;
  demoPin: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  studentUid: string;
  studentName: string;
  item: string;
  rating: number;
  feedback: string;
  createdAt: string;
}
