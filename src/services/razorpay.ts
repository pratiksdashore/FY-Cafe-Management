/** Razorpay frontend service
 *
 * Handles: script loading → backend order creation → modal open → result
 */

declare global {
    interface Window {
        Razorpay: any;
    }
}

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'https://smart-order-hub.onrender.com';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

/** Dynamically loads the Razorpay checkout script */
function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export interface PaymentResult {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export interface PaymentOptions {
    amount: number; // in rupees (will be converted to paise)
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    description?: string;
}

export const razorpayService = {
    /** Initiates a Razorpay payment flow.
     *  Returns PaymentResult on success, throws on failure/dismissal. */
    initiatePayment(options: PaymentOptions): Promise<PaymentResult> {
        return new Promise(async (resolve, reject) => {
            // 1. Load script
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                reject(new Error('Failed to load Razorpay checkout script. Check your internet connection.'));
                return;
            }

            // 2. Create Razorpay order via backend
            let rzpOrder: { id: string; amount: number; currency: string };
            try {
                const res = await fetch(`https://smart-order-hub.onrender.com/api/payment/create-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: Math.round(options.amount * 100), // paise
                        currency: 'INR',
                        receipt: `receipt_${Date.now()}`,
                    }),
                });

                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(errBody.error || `Backend error: ${res.status}`);
                }

                rzpOrder = await res.json();
            } catch (err: any) {
                reject(new Error(`Could not create payment order: ${err.message}`));
                return;
            }

            // 3. Open Razorpay modal
            const razorpay = new window.Razorpay({
                key: RAZORPAY_KEY_ID,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
                order_id: rzpOrder.id,
                name: 'QuickBite Canteen',
                description: options.description || 'Food Order Payment',
                image: '/favicon.ico',
                prefill: {
                    name: options.userName || '',
                    email: options.userEmail || '',
                    contact: options.userPhone || '',
                },
                theme: {
                    color: '#f97316', // matches primary orange
                },
                modal: {
                    ondismiss: () => {
                        reject(new Error('Payment cancelled by user'));
                    },
                },
                handler: (response: PaymentResult) => {
                    resolve(response);
                },
            });

            razorpay.open();
        });
    },
};
