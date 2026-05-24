import { useState, useEffect, useCallback } from 'react';
import {
    Star, Trash2, RefreshCw, Loader2, MessageSquare,
    Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from './lib/utils';
import { ratingService, FoodRating } from './lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const StarDisplay = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => {
    const cls = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={cn(cls, s <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-300')}
                />
            ))}
        </div>
    );
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// Group reviews by menu_item_id
interface GroupedItem {
    menuItemId: string;
    name: string;
    imageUrl?: string;
    avg: number;
    reviews: FoodRating[];
}

function groupByItem(reviews: FoodRating[]): GroupedItem[] {
    const map = new Map<string, GroupedItem>();
    for (const r of reviews) {
        const id = r.menu_item_id;
        if (!map.has(id)) {
            map.set(id, {
                menuItemId: id,
                name: r.menu_item_data?.name ?? 'Unknown Item',
                imageUrl: r.menu_item_data?.image_url,
                avg: 0,
                reviews: [],
            });
        }
        map.get(id)!.reviews.push(r);
    }
    // Compute averages
    map.forEach((g) => {
        g.avg = g.reviews.reduce((s, r) => s + r.rating, 0) / g.reviews.length;
    });
    // Sort by avg descending
    return Array.from(map.values()).sort((a, b) => b.avg - a.avg);
}

// ─── Single Review Row ───────────────────────────────────────────────────────
const ReviewRow = ({
    review,
    onDelete,
    deleting,
}: {
    review: FoodRating;
    onDelete: (id: string) => void;
    deleting: boolean;
}) => (
    <div className="flex items-start gap-3 py-3 border-t first:border-t-0">
        {/* Stars */}
        <div className="shrink-0 mt-0.5">
            <StarDisplay rating={review.rating} />
        </div>

        {/* Comment + meta */}
        <div className="flex-1 min-w-0">
            {review.comment ? (
                <p className="text-sm text-gray-700 leading-relaxed">"{review.comment}"</p>
            ) : (
                <p className="text-sm text-gray-400 italic">No comment left</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
                {review.is_anonymous ? '👤 Anonymous' : '👤 Customer'} · {timeAgo(review.created_at)}
            </p>
        </div>

        {/* Delete */}
        <button
            onClick={() => onDelete(review.id)}
            disabled={deleting}
            title="Delete review"
            className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
        >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
    </div>
);

// ─── Item Card (collapsible) ─────────────────────────────────────────────────
const ItemCard = ({
    group,
    onDelete,
    deletingId,
}: {
    group: GroupedItem;
    onDelete: (id: string) => void;
    deletingId: string | null;
}) => {
    const [expanded, setExpanded] = useState(false);

    const ratingColor =
        group.avg >= 4 ? 'text-green-600 bg-green-50 border-green-200'
            : group.avg >= 3 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                : 'text-red-600 bg-red-50 border-red-200';

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Header row — always visible */}
            <button
                onClick={() => setExpanded((p) => !p)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
            >
                {/* Item image */}
                {group.imageUrl ? (
                    <img
                        src={group.imageUrl}
                        alt={group.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 text-xl">
                        🍽️
                    </div>
                )}

                {/* Name + stars */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{group.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <StarDisplay rating={Math.round(group.avg)} />
                        <span className="text-xs text-gray-500">
                            {group.avg.toFixed(1)} · {group.reviews.length} review{group.reviews.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Avg badge */}
                <span className={cn('shrink-0 text-sm font-bold px-2.5 py-1 rounded-full border', ratingColor)}>
                    {group.avg.toFixed(1)} ★
                </span>

                {/* Expand icon */}
                {expanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                }
            </button>

            {/* Expanded reviews */}
            {expanded && (
                <div className="px-4 pb-4">
                    {group.reviews.map((r) => (
                        <ReviewRow
                            key={r.id}
                            review={r}
                            onDelete={onDelete}
                            deleting={deletingId === r.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Overall stats bar ────────────────────────────────────────────────────────
const StatsBar = ({ reviews }: { reviews: FoodRating[] }) => {
    const total = reviews.length;
    if (total === 0) return null;
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / total;
    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            {[
                { label: 'Total Reviews', value: total, color: 'text-orange-500' },
                { label: 'Avg Rating', value: `${avg.toFixed(1)} ★`, color: 'text-yellow-500' },
                { label: 'Items Reviewed', value: new Set(reviews.map((r) => r.menu_item_id)).size, color: 'text-blue-500' },
            ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl border shadow-sm p-4 text-center">
                    <p className={cn('text-3xl font-black', color)}>{value}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
                </div>
            ))}
        </div>
    );
};

// ─── Main Reviews Page ────────────────────────────────────────────────────────
const Reviews = () => {
    const [reviews, setReviews] = useState<FoodRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setReviews(await ratingService.getAll());
        } catch (err: any) {
            setError(err.message || 'Failed to load reviews');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReviews();
        const sub = ratingService.subscribeToReviews(() => fetchReviews());
        return () => { sub.unsubscribe(); };
    }, [fetchReviews]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this review? This cannot be undone.')) return;
        setDeletingId(id);
        try {
            await ratingService.deleteReview(id);
            setReviews((prev) => prev.filter((r) => r.id !== id));
        } catch (err: any) {
            alert(err.message || 'Failed to delete review');
        } finally {
            setDeletingId(null);
        }
    };

    const grouped = groupByItem(reviews).filter((g) =>
        !search || g.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            {/* Toolbar */}
            

            {/* Stats */}
            <StatsBar reviews={reviews} />

            {/* States */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-orange-400" />
                    <p>Loading reviews…</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 text-red-500">
                    <p className="font-semibold mb-1">Failed to load reviews</p>
                    <p className="text-sm">{error}</p>
                </div>
            ) : grouped.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No reviews found</p>
                    <p className="text-sm mt-1">Customer ratings will appear here once submitted.</p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-gray-500">
                        <span className="font-semibold text-gray-800">{grouped.length}</span> item{grouped.length !== 1 ? 's' : ''} reviewed
                    </p>
                    <div className="space-y-3">
                        {grouped.map((g) => (
                            <ItemCard
                                key={g.menuItemId}
                                group={g}
                                onDelete={handleDelete}
                                deletingId={deletingId}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Reviews;
