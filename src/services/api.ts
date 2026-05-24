import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async sendOTP(phoneNumber: string) {
    return this.client.post('/auth/send-otp', { phone_number: phoneNumber });
  }

  async verifyOTP(phoneNumber: string, otp: string, role?: string) {
    return this.client.post('/auth/verify-otp', { phone_number: phoneNumber, otp, role });
  }

  async getProfile() {
    return this.client.get('/auth/profile');
  }

  // Vendor endpoints
  async getVendors(isActive = true) {
    return this.client.get('/vendors', { params: { is_active: isActive } });
  }

  async getVendorById(vendorId: string) {
    return this.client.get(`/vendors/${vendorId}`);
  }

  // Menu endpoints
  async getMenuItems(params?: {
    vendor_id?: string;
    category_id?: string;
    food_type?: string;
    is_special?: boolean;
    is_best_seller?: boolean;
    page?: number;
    limit?: number;
  }) {
    return this.client.get('/menu', { params });
  }

  async getMenuItemById(itemId: string) {
    return this.client.get(`/menu/${itemId}`);
  }

  async searchMenuItems(query: string, vendorId?: string) {
    return this.client.get('/menu/search', { params: { q: query, vendor_id: vendorId } });
  }

  async getRecommendations(vendorId?: string) {
    return this.client.get('/menu/recommendations', { params: { vendor_id: vendorId } });
  }

  // Order endpoints
  async createOrder(orderData: {
    vendor_id: string;
    items: Array<{
      menu_item_id: string;
      quantity: number;
      special_instructions?: string;
    }>;
    pickup_time: string;
    special_instructions?: string;
    group_order_id?: string;
  }) {
    return this.client.post('/orders', orderData);
  }

  async getUserOrders(params?: { page?: number; limit?: number; status?: string }) {
    return this.client.get('/orders', { params });
  }

  async getOrderById(orderId: string) {
    return this.client.get(`/orders/${orderId}`);
  }

  async cancelOrder(orderId: string, reason: string) {
    return this.client.post(`/orders/${orderId}/cancel`, { cancellation_reason: reason });
  }

  async getTokenStatus(orderId: string) {
    return this.client.get(`/orders/${orderId}/token-status`);
  }

  // Payment endpoints
  async createPaymentOrder(orderId: string, amount: number) {
    return this.client.post('/payments/create-order', { order_id: orderId, amount });
  }

  async verifyPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return this.client.post('/payments/verify', paymentData);
  }

  // Review endpoints
  async createReview(reviewData: {
    order_id: string;
    menu_item_id: string;
    rating: number;
    comment?: string;
    is_anonymous?: boolean;
  }) {
    return this.client.post('/reviews', reviewData);
  }

  async getMenuItemReviews(itemId: string, page = 1, limit = 20) {
    return this.client.get(`/reviews/menu-item/${itemId}`, { params: { page, limit } });
  }

  // Favorites endpoints
  async addToFavorites(menuItemId: string) {
    return this.client.post('/reviews/favorites', { menu_item_id: menuItemId });
  }

  async getFavorites() {
    return this.client.get('/reviews/favorites');
  }

  async removeFromFavorites(itemId: string) {
    return this.client.delete(`/reviews/favorites/${itemId}`);
  }

  // Admin endpoints
  async updateOrderStatus(orderId: string, status: string) {
    return this.client.put(`/admin/orders/${orderId}/status`, { status });
  }

  async getOrderQueue(vendorId?: string, date?: string) {
    return this.client.get('/admin/orders/queue', { params: { vendor_id: vendorId, date } });
  }

  async getAnalytics(params?: { vendor_id?: string; start_date?: string; end_date?: string }) {
    return this.client.get('/admin/analytics', { params });
  }

  async manageSurplusFood(data: {
    menu_item_id: string;
    surplus_quantity: number;
    discount_percentage: number;
  }) {
    return this.client.post('/admin/surplus-food', data);
  }

  async getIdleTimeSlots(vendorId?: string, date?: string) {
    return this.client.get('/admin/idle-slots', { params: { vendor_id: vendorId, date } });
  }

  async updateStock(itemId: string, quantity: number, reason?: string) {
    return this.client.post(`/menu/${itemId}/stock`, { quantity, reason });
  }
}

export const api = new ApiService();
export default api;
