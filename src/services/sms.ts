// SMS Service using backend API
const SMS_SERVICE_URL = import.meta.env.VITE_SMS_SERVICE_URL || 'https://smart-order-hub.onrender.com';

export interface SMSNotificationParams {
  to: string;
  tokenNumber: number;
  waitMinutes: number;
  totalAmount: number;
  itemsCount: number;
}

export const smsService = {
  // Send order confirmation SMS with wait time
  sendOrderConfirmation: async (params: SMSNotificationParams): Promise<boolean> => {
    try {
      const response = await fetch(`${SMS_SERVICE_URL}/api/sms/order-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Order confirmation SMS sent successfully:', result.messageId);
        return true;
      } else {
        console.error('Failed to send order confirmation SMS:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to send order confirmation SMS:', error.message);
      return false;
    }
  },

  // Send order ready notification
  sendOrderReadyNotification: async (to: string, tokenNumber: number): Promise<boolean> => {
    try {
      const response = await fetch(`${SMS_SERVICE_URL}/api/sms/order-ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, tokenNumber }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Order ready SMS sent successfully:', result.messageId);
        return true;
      } else {
        console.error('Failed to send order ready SMS:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to send order ready SMS:', error.message);
      return false;
    }
  },

  // Test SMS functionality
  testSMS: async (to: string): Promise<boolean> => {
    try {
      const response = await fetch(`${SMS_SERVICE_URL}/api/sms/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Test SMS sent successfully:', result.messageId);
        return true;
      } else {
        console.error('Failed to send test SMS:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to send test SMS:', error.message);
      return false;
    }
  },

  // Check if SMS service is healthy
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${SMS_SERVICE_URL}/api/sms/health`);
      const result = await response.json();
      return result.status === 'ok' && result.twilioConfigured;
    } catch (error: any) {
      console.error('SMS service health check failed:', error.message);
      return false;
    }
  }
};
