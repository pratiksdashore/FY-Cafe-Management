import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { StarRating } from './StarRating';
import { Button } from './ui/button';
import { ratingService } from '@/services/supabase';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReviewModalProps {
    orderId: string;
    menuItemId: string;
    menuItemName: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export const ReviewModal = ({
    orderId,
    menuItemId,
    menuItemName,
    onClose,
    onSuccess,
}: ReviewModalProps) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            toast({
                title: 'Rating required',
                description: 'Please select a star rating',
                variant: 'destructive',
            });
            return;
        }

        try {
            setSubmitting(true);
            await ratingService.submitRating({
                menu_item_id: menuItemId,
                order_id: orderId,
                rating,
                comment: comment.trim() || undefined,
                is_anonymous: isAnonymous,
            });

            toast({
                title: '✅ Review submitted',
                description: 'Thank you for your feedback!',
            });

            onSuccess?.();
            onClose();
        } catch (err: any) {
            toast({
                title: 'Failed to submit review',
                description: err.response?.data?.error || 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
                    <h3 className="font-display font-semibold text-lg">Write a Review</h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Item Name */}
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Item</p>
                        <p className="font-semibold">{menuItemName}</p>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-medium mb-3">
                            Rating <span className="text-destructive">*</span>
                        </label>
                        <div className="flex justify-center">
                            <StarRating rating={rating} onRatingChange={setRating} size="lg" />
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Comment (optional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your experience..."
                            className="w-full p-3 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                            maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                            {comment.length}/500
                        </p>
                    </div>

                    {/* Anonymous Option */}
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                        <input
                            type="checkbox"
                            id="anonymous"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="mt-1"
                        />
                        <label htmlFor="anonymous" className="text-sm cursor-pointer">
                            <span className="font-medium">Post anonymously</span>
                            <p className="text-muted-foreground mt-0.5">
                                Your name will be hidden from other users
                            </p>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={submitting || rating === 0}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Review'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
