// SMS Service for Admin Portal
const SMS_SERVICE_URL = import.meta.env.VITE_SMS_SERVICE_URL || 'https://smart-order-hub.onrender.com';

export const smsService = {
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
            return result.success;
        } catch (error: any) {
            console.error('Failed to send order ready SMS:', error.message);
            return false;
        }
    },

    // Send order completed notification
    sendOrderCompletedNotification: async (to: string, tokenNumber: number): Promise<boolean> => {
        try {
            const response = await fetch(`${SMS_SERVICE_URL}/api/sms/order-completed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ to, tokenNumber }),
            });

            const result = await response.json();
            return result.success;
        } catch (error: any) {
            console.error('Failed to send order completed SMS:', error.message);
            return false;
        }
    },

    // Send Today's Special notification to multiple numbers
    sendTodaysSpecialNotification: async (params: {
        phoneNumbers: string[];
        itemName: string;
        price?: number;
        description?: string;
    }): Promise<{ success: boolean; sentCount: number; failedCount: number }> => {
        try {
            const response = await fetch(`${SMS_SERVICE_URL}/api/sms/todays-special`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            return await response.json();
        } catch (error: any) {
            console.error('Failed to send marketing SMS:', error.message);
            return { success: false, sentCount: 0, failedCount: 0 };
        }
    },

    // Send Discount alert notification to multiple numbers
    sendDiscountNotification: async (params: {
        phoneNumbers: string[];
        itemName: string;
        discountPercent: number;
        originalPrice?: number;
        newPrice?: number;
    }): Promise<{ success: boolean; sentCount: number; failedCount: number }> => {
        try {
            const response = await fetch(`${SMS_SERVICE_URL}/api/sms/discount-alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            return await response.json();
        } catch (error: any) {
            console.error('Failed to send discount SMS:', error.message);
            return { success: false, sentCount: 0, failedCount: 0 };
        }
    },

    // Marketing Settings
    getMarketingSettings: async () => {
        try {
            const response = await fetch(`${SMS_SERVICE_URL}/api/marketing/settings`);
            return await response.json();
        } catch (error: any) {
            console.error('Failed to fetch marketing settings:', error.message);
            return { daily_notification_time: '12:00:00', is_enabled: false };
        }
    },

    updateMarketingSettings: async (settings: { daily_notification_time: string; is_enabled: boolean }) => {
        try {
            const response = await fetch(`${SMS_SERVICE_URL}/api/marketing/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });
            return await response.json();
        } catch (error: any) {
            console.error('Failed to update marketing settings:', error.message);
            return null;
        }
    }
};
