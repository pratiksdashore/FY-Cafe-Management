import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/food/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CreditCard, Smartphone, AlertCircle, ShieldCheck, CalendarClock, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { orderService } from '@/services/supabase';
import { razorpayService } from '@/services/razorpay';
import { smsService } from '@/services/sms';
import { cn } from '@/lib/utils';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderType, setOrderType] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const getScheduledAt = (): Date | undefined => {
    if (orderType !== 'scheduled' || !scheduledDate || !scheduledTime) return undefined;
    return new Date(`${scheduledDate}T${scheduledTime}`);
  };

  const total = totalAmount;

  const handlePlaceOrder = async () => {
    if (!phone || phone.length < 10) {
      toast({
        title: 'Enter Phone Number',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }

    // Validate scheduled time
    const scheduledAt = getScheduledAt();
    if (orderType === 'scheduled') {
      if (!scheduledDate || !scheduledTime) {
        toast({ title: 'Pick a schedule time', description: 'Please select both date and time for your pre-order.', variant: 'destructive' });
        return;
      }
    }

    setIsProcessing(true);

    try {
      // 1. Open Razorpay payment modal
      let paymentResult;
      try {
        paymentResult = await razorpayService.initiatePayment({
          amount: total,
          userName: user.user_metadata?.full_name || '',
          userEmail: user.email || '',
          userPhone: phone,
          description: `QuickBite order – ${items.length} item${items.length !== 1 ? 's' : ''}`,
        });
      } catch (paymentError: any) {
        // User dismissed or payment failed
        if (paymentError.message?.includes('cancelled')) {
          toast({
            title: 'Payment Cancelled',
            description: 'You cancelled the payment. Your order was not placed.',
          });
        } else {
          toast({
            title: 'Payment Failed',
            description: paymentError.message || 'Unable to process payment. Please try again.',
            variant: 'destructive',
          });
        }
        setIsProcessing(false);
        return;
      }

      // 2. Payment succeeded – create order in database
      const scheduledAt = getScheduledAt();
      let waitMinutes: number;
      let estimatedReadyAt: Date;

      if (scheduledAt) {
        // For pre-orders, estimated ready = scheduled time + prep time
        const prepMinutes = await orderService.calculateWaitTime(items);
        estimatedReadyAt = new Date(scheduledAt.getTime() + prepMinutes * 60000);
        waitMinutes = Math.round((scheduledAt.getTime() - Date.now()) / 60000);
      } else {
        waitMinutes = await orderService.calculateWaitTime(items);
        estimatedReadyAt = new Date(Date.now() + waitMinutes * 60000);
      }

      const order = await orderService.createOrder(
        user.id,
        total,
        phone,
        estimatedReadyAt,
        paymentResult.razorpay_payment_id,
        scheduledAt,
      );

      await orderService.createOrderItems(
        order.id,
        items.map((item) => {
          const basePrice = item.discountPercent && item.discountPercent > 0
            ? Math.round(item.price * (1 - item.discountPercent / 100))
            : item.price;
          const customizationsPrice = (item.selectedCustomizations || []).reduce((s, o) => s + o.price, 0);
          const effectiveUnitPrice = basePrice + customizationsPrice;

          return {
            menu_item_id: item.id,
            menu_item_data: item, // full item data including selectedCustomizations
            quantity: item.quantity,
            unit_price: effectiveUnitPrice,
          };
        })
      );

      // 3. Send SMS notification with order details and wait time
      try {
        await smsService.sendOrderConfirmation({
          to: phone,
          tokenNumber: order.token_number,
          waitMinutes: waitMinutes,
          totalAmount: total,
          itemsCount: items.length,
        });
      } catch (smsError: any) {
        console.warn('Failed to send SMS notification:', smsError.message);
        // Don't fail the order if SMS fails
      }

      // 4. Clear cart and redirect
      await clearCart();

      toast({
        title: 'Payment Successful! 🎉',
        description: `Payment ID: ${paymentResult.razorpay_payment_id}`,
      });

      navigate('/order-confirmation', {
        state: {
          token: order.token_number,
          orderId: order.id,
          total,
          items: items.length,
          paymentId: paymentResult.razorpay_payment_id,
          waitTime: scheduledAt ? null : waitMinutes,
          scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        },
      });
    } catch (error: any) {
      console.error('Order placement failed:', error);
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header onCartClick={() => { }} />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-2xl mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add some items to proceed with checkout</p>
          <Button onClick={() => navigate('/')}>Browse Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => { }} />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/cart')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>

        <h1 className="font-display font-bold text-2xl mb-6">Checkout</h1>

        {/* Order Summary */}
        <div className="bg-card rounded-2xl border p-6 mb-6">
          <h3 className="font-semibold mb-4">Order Summary</h3>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.name}
                </span>
                <span>
                  ₹{(
                    (item.discountPercent && item.discountPercent > 0
                      ? Math.round(item.price * (1 - item.discountPercent / 100))
                      : item.price) +
                    (item.selectedCustomizations || []).reduce((s, o) => s + o.price, 0)
                  ) * item.quantity}
                </span>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary text-lg">₹{total}</span>
            </div>
          </div>
        </div>

        {/* Order Timing */}
        <div className="bg-card rounded-2xl border p-6 mb-6">
          <h3 className="font-semibold mb-4">When do you want it?</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setOrderType('now')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                orderType === 'now'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              <Zap className="w-5 h-5" />
              <span className="text-sm font-semibold">Order Now</span>
              <span className="text-xs opacity-70">Ready ASAP</span>
            </button>
            <button
              onClick={() => setOrderType('scheduled')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                orderType === 'scheduled'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              <CalendarClock className="w-5 h-5" />
              <span className="text-sm font-semibold">Schedule</span>
              <span className="text-xs opacity-70">Pick a time</span>
            </button>
          </div>

          {orderType === 'scheduled' && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label htmlFor="sched-date">Date</Label>
                <Input
                  id="sched-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="sched-time">Time</Label>
                <Input
                  id="sched-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              {scheduledDate && scheduledTime && (
                <p className="col-span-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                  🕐 Your order will be prepared and ready around{' '}
                  <span className="font-semibold text-foreground">
                    {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="bg-card rounded-2xl border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Contact Details</h3>
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your 10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground mt-2">
              We'll send order updates to this number
            </p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-card rounded-2xl border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Payment</h3>
          </div>
          {/* Razorpay badge */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
            <div className="w-10 h-10 rounded-lg bg-[#072654] flex items-center justify-center shrink-0 text-white font-bold text-xs">
              Rz
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Razorpay Secure Payment</p>
              <p className="text-xs text-muted-foreground">UPI · Credit/Debit Cards · Net Banking · Wallets</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            🔒 Payments are encrypted and processed securely by Razorpay
          </p>
        </div>

        {/* Place Order Button */}
        <Button
          className="w-full h-14 text-lg font-semibold"
          onClick={handlePlaceOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>{orderType === 'scheduled' ? `Schedule & Pay ₹${total}` : `Pay ₹${total} via Razorpay`}</>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By placing this order, you agree to our terms and conditions
        </p>
      </main>
    </div>
  );
};

const Checkout = () => <CheckoutPage />;
export default Checkout;
