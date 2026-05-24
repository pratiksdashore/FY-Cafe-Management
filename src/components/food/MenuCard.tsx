import { useState } from 'react';
import { MenuItem } from '@/types/food';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Clock, Star, Flame, ChevronDown, ChevronUp, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/services/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FoodReview {
  id: string;
  rating: number;
  comment?: string;
  is_anonymous: boolean;
  created_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const StarRow = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(cls, s <= Math.round(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-none text-gray-300'
          )}
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

// ─── Reviews Panel ─────────────────────────────────────────────────────────────
const ReviewsPanel = ({ menuItemId }: { menuItemId: string }) => {
  const [reviews, setReviews] = useState<FoodReview[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const toggle = async () => {
    if (!open && reviews === null) {
      // Fetch only on first open
      setLoading(true);
      try {
        const { data } = await supabase
          .from('food_ratings')
          .select('id, rating, comment, is_anonymous, created_at')
          .eq('menu_item_id', menuItemId)
          .order('created_at', { ascending: false });
        setReviews((data as FoodReview[]) || []);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    }
    setOpen((p) => !p);
  };

  return (
    <div className="border-t mt-3 pt-2">
      {/* Toggle button */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <span className="font-medium flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          {open ? 'Hide reviews' : 'Show reviews'}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          ) : !reviews || reviews.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-40" />
              <p className="text-xs">No reviews yet. Be the first!</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="bg-muted/50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <StarRow rating={r.rating} />
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {timeAgo(r.created_at)}
                  </span>
                </div>
                {r.comment ? (
                  <p className="text-xs text-foreground leading-relaxed">"{r.comment}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No comment</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {r.is_anonymous ? '👤 Anonymous' : '👤 Customer'}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Menu Card ─────────────────────────────────────────────────────────────────
interface MenuCardProps {
  item: MenuItem;
}

export const MenuCard = ({ item }: MenuCardProps) => {
  const { addItem } = useCart();

  const hasRating = (item.ratingCount ?? 0) > 0;

  return (
    <div
      className={cn(
        "group bg-card rounded-2xl overflow-hidden food-card-hover border border-border",
        !item.available && "opacity-60"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {item.isBestSeller && (
            <Badge className="bg-golden-amber text-espresso font-semibold text-xs">
              <Flame className="w-3 h-3 mr-1" />
              Bestseller
            </Badge>
          )}
          {item.isTodaySpecial && (
            <Badge className="bg-secondary text-secondary-foreground font-semibold text-xs">
              ✨ Today's Special
            </Badge>
          )}
        </div>

        {/* Veg/Non-veg indicator */}
        <div className="absolute top-2 right-2">
          <div className={cn(
            "w-5 h-5 border-2 rounded flex items-center justify-center",
            item.isVeg ? "border-fresh-green" : "border-destructive"
          )}>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              item.isVeg ? "bg-fresh-green" : "bg-destructive"
            )} />
          </div>
        </div>

        {/* Out of stock overlay */}
        {!item.available && (
          <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-medium">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-semibold text-lg text-card-foreground line-clamp-1">
            {item.name}
          </h3>

          {/* Rating badge */}
          <div className="flex items-center gap-1 shrink-0">
            <Star className={cn(
              "w-4 h-4",
              hasRating ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300"
            )} />
            {hasRating ? (
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-card-foreground">
                  {(item.avgRating ?? 0).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({item.ratingCount})
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">No ratings</span>
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
          {item.description}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price and Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {item.discountPercent !== undefined && item.discountPercent > 0 ? (
                <>
                  <span className="font-display font-bold text-xl text-card-foreground">
                    ₹{(item.price * (1 - item.discountPercent / 100)).toFixed(0)}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground line-through">
                      ₹{item.price}
                    </span>
                    <span className="text-green-600 font-black text-base leading-none mt-1">
                      {item.discountPercent}% off
                    </span>
                  </div>
                </>
              ) : (
                <span className="font-display font-bold text-xl text-card-foreground">
                  ₹{item.price}
                </span>
              )}
            </div>
            <span className="flex items-center text-[10px] text-muted-foreground mt-0.5">
              <Clock className="w-3 h-3 mr-1" />
              {item.prepTime} min
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => addItem(item)}
            disabled={!item.available}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* ── Real Reviews Panel ── */}
        <ReviewsPanel menuItemId={item.id} />
      </div>
    </div>
  );
};
