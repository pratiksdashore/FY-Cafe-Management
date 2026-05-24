import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
    itemId: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const FavoriteButton = ({ itemId, className, size = 'md' }: FavoriteButtonProps) => {
    const { isFavorite, toggleFavorite } = useFavorites();
    const favorite = isFavorite(itemId);

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleFavorite(itemId);
            }}
            className={cn(
                'rounded-full bg-white/90 backdrop-blur-sm shadow-md',
                'flex items-center justify-center',
                'hover:scale-110 active:scale-95 transition-all',
                'border border-border',
                sizeClasses[size],
                className
            )}
            aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Heart
                className={cn(
                    iconSizes[size],
                    'transition-all',
                    favorite
                        ? 'fill-red-500 text-red-500 animate-heart-beat'
                        : 'text-muted-foreground hover:text-red-500'
                )}
            />
        </button>
    );
};
