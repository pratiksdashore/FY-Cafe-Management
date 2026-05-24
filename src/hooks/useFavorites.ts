import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { toast } from './use-toast';

export const useFavorites = () => {
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Fetch user favorites on mount
    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const response = await api.getFavorites();
            const favoriteIds = new Set(
                response.data.data.map((fav: any) => fav.menu_item_id)
            );
            setFavorites(favoriteIds);
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async (itemId: string) => {
        const isFavorite = favorites.has(itemId);

        // Optimistic update
        setFavorites((prev) => {
            const newSet = new Set(prev);
            if (isFavorite) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });

        try {
            if (isFavorite) {
                await api.removeFromFavorites(itemId);
                toast({
                    title: 'Removed from favorites',
                    description: 'Item removed from your wishlist',
                });
            } else {
                await api.addToFavorites(itemId);
                toast({
                    title: '❤️ Added to favorites',
                    description: 'Item saved to your wishlist',
                });
            }
        } catch (err: any) {
            // Revert on error
            setFavorites((prev) => {
                const newSet = new Set(prev);
                if (isFavorite) {
                    newSet.add(itemId);
                } else {
                    newSet.delete(itemId);
                }
                return newSet;
            });

            toast({
                title: 'Error',
                description: err.response?.data?.error || 'Failed to update favorites',
                variant: 'destructive',
            });
        }
    };

    const isFavorite = (itemId: string) => favorites.has(itemId);

    return {
        favorites,
        loading,
        toggleFavorite,
        isFavorite,
        refetch: fetchFavorites,
    };
};
