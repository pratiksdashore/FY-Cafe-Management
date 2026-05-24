import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useMenuItems } from '@/hooks/useMenu';
import { FavoriteButton } from '@/components/FavoriteButton';
import { cn } from '@/lib/utils';

const Favorites = () => {
    const navigate = useNavigate();
    const { favorites, loading: favoritesLoading } = useFavorites();
    const { items, loading: itemsLoading } = useMenuItems();

    // Filter items that are in favorites
    const favoriteItems = items.filter((item) => favorites.has(item.id));

    const loading = favoritesLoading || itemsLoading;

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading favorites...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 glass shadow-food">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                            <h1 className="font-display font-bold text-xl">My Favorites</h1>
                        </div>
                        <span className="ml-auto text-sm text-muted-foreground">
                            {favoriteItems.length} {favoriteItems.length === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-4xl">
                {favoriteItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {favoriteItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-card rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow group"
                            >
                                {/* Image */}
                                <div className="relative aspect-video">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <span className="text-4xl">🍽️</span>
                                        </div>
                                    )}

                                    {/* Favorite Button */}
                                    <div className="absolute top-2 right-2">
                                        <FavoriteButton itemId={item.id} size="sm" />
                                    </div>

                                    {/* Badges */}
                                    <div className="absolute bottom-2 left-2 flex flex-col gap-1 items-start">
                                        {item.isBestSeller && (
                                            <span className="px-2 py-0.5 bg-primary/90 text-primary-foreground text-[10px] font-bold rounded-full backdrop-blur-sm">
                                                🔥 Best Seller
                                            </span>
                                        )}
                                        {item.isTodaySpecial && (
                                            <span className="px-2 py-0.5 bg-golden-amber/90 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
                                                ✨ Special
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-semibold mb-1 line-clamp-1">{item.name}</h3>
                                    {item.description && (
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg text-primary">
                                                    ₹{item.discountPercent && item.discountPercent > 0
                                                        ? Math.round(item.price * (1 - item.discountPercent / 100))
                                                        : item.price}
                                                </span>
                                                {item.discountPercent && item.discountPercent > 0 && (
                                                    <span className="text-sm text-muted-foreground line-through">
                                                        ₹{item.price}
                                                    </span>
                                                )}
                                            </div>
                                            {item.discountPercent && item.discountPercent > 0 && (
                                                <span className="text-green-600 font-black text-xs leading-none mt-0.5">
                                                    {item.discountPercent}% off
                                                </span>
                                            )}
                                        </div>
                                        {item.avgRating && item.avgRating > 0 && (
                                            <div className="flex items-center gap-1 text-sm">
                                                <span>⭐</span>
                                                <span className="font-medium">{item.avgRating.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Add to Cart Button */}
                                    <Button
                                        className="w-full"
                                        disabled={!item.available}
                                        onClick={() => {
                                            // Add to cart handled via navigation for simplicity in Favorites page
                                            navigate('/');
                                        }}
                                    >
                                        {item.available ? (
                                            <>
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                Add to Cart
                                            </>
                                        ) : (
                                            'Out of Stock'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Empty State
                    <div className="text-center py-16">
                        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                            <Heart className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="font-display font-semibold text-xl mb-2">No favorites yet</h3>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Start adding your favorite dishes to quickly access them later
                        </p>
                        <Button onClick={() => navigate('/')}>
                            Browse Menu
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Favorites;
