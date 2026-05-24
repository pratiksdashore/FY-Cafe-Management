import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Copy, ShoppingBag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, total, items, waitTime, scheduledAt } = location.state || {};

  if (!token) {
    navigate('/');
    return null;
  }

  const copyToken = () => {
    navigator.clipboard.writeText(token.toString());
    toast({ title: 'Token Copied', description: 'Order token copied to clipboard' });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success */}
        <div className="text-center mb-8 animate-scale-in">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">Order Confirmed! 🎉</h1>
          <p className="text-muted-foreground">
            Your order has been placed successfully
          </p>
        </div>

        {/* Token Card */}
        <div className="bg-card rounded-2xl border p-6 mb-6 text-center animate-slide-up">
          <p className="text-muted-foreground text-sm mb-2">Your Order Token</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-display font-bold text-5xl text-primary">
              #{token}
            </span>
            <Button variant="ghost" size="icon" onClick={copyToken} className="text-muted-foreground">
              <Copy className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Show this token at the counter to collect your order
          </p>
        </div>

        {/* Wait Time / Schedule Card */}
        {scheduledAt ? (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-6 text-center animate-slide-up">
            <p className="text-purple-600 text-sm mb-2">Pre-order Scheduled For</p>
            <p className="font-display font-bold text-2xl text-purple-800">
              {new Date(scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <p className="text-xs text-purple-500 mt-3">
              The kitchen will start preparing your order at this time
            </p>
          </div>
        ) : waitTime ? (
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 mb-6 text-center animate-slide-up">
            <p className="text-muted-foreground text-sm mb-2">Estimated Wait Time</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-display font-bold text-4xl text-primary">
                {waitTime}
              </span>
              <span className="text-xl font-semibold text-primary/80">mins</span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              We'll send an SMS when your order is ready for pickup
            </p>
          </div>
        ) : null}

        {/* Order Details */}
        <div className="bg-card rounded-2xl border p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Total</p>
              <p className="font-semibold text-lg">₹{total} · {items} item{items !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Status chip */}
          <div className={scheduledAt
            ? "bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3"
            : "bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3"
          }>
            <div className={`w-3 h-3 rounded-full shrink-0 ${scheduledAt ? 'bg-purple-400' : 'bg-yellow-400 animate-pulse'}`} />
            <div>
              <p className={`font-semibold text-sm ${scheduledAt ? 'text-purple-800' : 'text-yellow-800'}`}>
                {scheduledAt ? 'Status: Pre-order Confirmed' : 'Status: Placed'}
              </p>
              <p className={`text-xs ${scheduledAt ? 'text-purple-700' : 'text-yellow-700'}`}>
                {scheduledAt
                  ? 'Kitchen will prepare your order at the scheduled time'
                  : "We'll notify you when your order is being prepared"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 animate-slide-up">
          <Button className="w-full h-12" onClick={() => navigate('/orders')}>
            Track Order Status
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => navigate('/')}>
            Order More
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
