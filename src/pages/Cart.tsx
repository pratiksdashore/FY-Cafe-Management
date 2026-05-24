import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/food/Header';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Minus,
    Plus,
    Trash2,
    ShoppingBag,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { CustomizationModal } from '@/components/food/CustomizationModal';
import { CustomizationOption, CartItem } from '@/types/food';
import { Settings2 } from 'lucide-react';

const Cart = () => {
    const navigate = useNavigate();
    const { items, updateQuantity, removeItem, totalAmount, totalItems, clearCart, loading, updateCustomizations } = useCart();
    const { isAuthenticated } = useAuth();
    const [customizeItem, setCustomizeItem] = useState<CartItem | null>(null);

    const total = totalAmount;


    const handleCheckout = () => {
        if (!isAuthenticated) {
            navigate('/signin', { state: { from: { pathname: '/checkout' } } });
            return;
        }
        navigate('/checkout');
    };

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Header onCartClick={() => { }} />
                <div className="container mx-auto px-4 py-16 text-center max-w-md">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading your cart...</p>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-background">
                <Header onCartClick={() => { }} />
                <div className="container mx-auto px-4 py-16 text-center max-w-md">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="font-display font-bold text-2xl mb-2">Your cart is empty</h2>
                    <p className="text-muted-foreground mb-6">
                        Add some delicious items to get started
                    </p>
                    <Button onClick={() => navigate('/')}>Browse Menu</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header onCartClick={() => { }} />

            <main className="container mx-auto px-4 py-6 max-w-2xl">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    className="mb-6"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Continue Shopping
                </Button>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="font-display font-bold text-2xl">
                        Your Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                    </h1>
                    {items.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearCart}
                            className="text-destructive hover:text-destructive"
                        >
                            Clear All
                        </Button>
                    )}
                </div>

                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-card rounded-2xl border p-4 flex gap-4"
                        >
                            {/* Item Image */}
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">
                                        🍽️
                                    </div>
                                )}
                            </div>

                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate">{item.name}</h3>
                                        {item.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Customizations Summary */}
                                {item.selectedCustomizations && item.selectedCustomizations.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {item.selectedCustomizations.map((opt) => (
                                            <span
                                                key={opt.id}
                                                className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                                            >
                                                + {opt.name} (₹{opt.price})
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Customize Button */}
                                <div className="mt-3 flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-semibold gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                        onClick={() => setCustomizeItem(item)}
                                    >
                                        <Settings2 className="w-3 h-3" />
                                        Customize Order
                                    </Button>
                                </div>

                                {/* Quantity Controls & Price */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        >
                                            <Minus className="w-3 h-3" />
                                        </Button>
                                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end">
                                            <p className="font-display font-bold text-lg text-primary">
                                                ₹{item.discountPercent && item.discountPercent > 0
                                                    ? Math.round(item.price * (1 - item.discountPercent / 100)) * item.quantity
                                                    : item.price * item.quantity}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {item.discountPercent && item.discountPercent > 0 && (
                                                    <>
                                                        <span className="text-xs text-muted-foreground line-through">
                                                            ₹{item.price * item.quantity}
                                                        </span>
                                                        <span className="text-[10px] font-black text-green-600 uppercase italic leading-none">
                                                            {item.discountPercent}% OFF
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {item.quantity > 1 && (
                                                <p className="text-[10px] text-muted-foreground mt-1 text-nowrap">
                                                    ₹{item.discountPercent && item.discountPercent > 0
                                                        ? Math.round(item.price * (1 - item.discountPercent / 100))
                                                        : item.price} each
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bill Summary */}
                <div className="bg-card rounded-2xl border p-6 mb-6">
                    <h3 className="font-semibold mb-4">Bill Summary</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                            <span>₹{totalAmount}</span>
                        </div>

                        <div className="border-t pt-3 flex justify-between font-semibold">
                            <span>Total Amount</span>
                            <span className="text-primary text-lg">₹{total}</span>
                        </div>
                    </div>
                </div>

                {/* Authentication Notice */}
                {!isAuthenticated && (
                    <div className="bg-golden-amber/10 border border-golden-amber/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-golden-amber shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Sign in to checkout</h4>
                            <p className="text-muted-foreground text-sm">
                                You'll need to sign in or create an account to place your order
                            </p>
                        </div>
                    </div>
                )}

                {/* Checkout Button */}
                <Button
                    className="w-full h-14 text-lg font-semibold"
                    onClick={handleCheckout}
                >
                    {isAuthenticated ? 'Proceed to Checkout' : 'Sign In to Checkout'}
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-4">
                    Review your order before proceeding to payment
                </p>
            </main>

            {/* Customization Modal */}
            {customizeItem && (
                <CustomizationModal
                    item={customizeItem}
                    onClose={() => setCustomizeItem(null)}
                    onSave={async (options) => {
                        await updateCustomizations(customizeItem.id, options);
                    }}
                />
            )}
        </div>
    );
};

export default Cart;
