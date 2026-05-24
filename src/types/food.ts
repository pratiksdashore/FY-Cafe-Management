export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  is_available: boolean;
  discount_percent: number;
  customizationOptions?: CustomizationOption[];
  rating: number;        // legacy static field kept for compatibility
  avgRating?: number;    // live average from food_ratings table
  ratingCount?: number;  // number of actual reviews
  prepTime: number; // in minutes
  customizable?: boolean;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
  selectedCustomizations?: CustomizationOption[];
  _cartItemId?: string; // Database ID from cart_items table
}

export interface Order {
  id: string;
  token: number;
  items: CartItem[];
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  pickupTime: string;
  totalAmount: number;
  createdAt: Date;
  estimatedPrepTime: number;
}

export interface User {
  id: string;
  phone: string;
  name?: string;
  favorites: string[];
  orderHistory: Order[];
}
