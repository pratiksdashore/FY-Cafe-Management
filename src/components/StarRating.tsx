import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showCount?: boolean;
    count?: number;
}

export const StarRating = ({
    rating,
    onRatingChange,
    readonly = false,
    size = 'md',
    showCount = false,
    count,
}: StarRatingProps) => {
    const [hoverRating, setHoverRating] = useState(0);

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const displayRating = readonly ? rating : hoverRating || rating;

    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        disabled={readonly}
                        onClick={() => onRatingChange?.(star)}
                        onMouseEnter={() => !readonly && setHoverRating(star)}
                        onMouseLeave={() => !readonly && setHoverRating(0)}
                        className={cn(
                            'transition-all',
                            !readonly && 'hover:scale-110 cursor-pointer',
                            readonly && 'cursor-default'
                        )}
                        aria-label={`Rate ${star} stars`}
                    >
                        <Star
                            className={cn(
                                sizeClasses[size],
                                'transition-colors',
                                star <= displayRating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-none text-muted-foreground'
                            )}
                        />
                    </button>
                ))}
            </div>

            {showCount && count !== undefined && (
                <span className="text-sm text-muted-foreground ml-1">
                    ({count})
                </span>
            )}

            {!readonly && hoverRating > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                    {hoverRating} {hoverRating === 1 ? 'star' : 'stars'}
                </span>
            )}
        </div>
    );
};
