import { useState } from 'react';
import { MenuItem } from '@/hooks/useMenu';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mood = 'happy' | 'stressed' | 'energetic' | 'comfort' | 'healthy';

interface MoodOption {
    mood: Mood;
    emoji: string;
    label: string;
    description: string;
    keywords: string[];
}

const moodOptions: MoodOption[] = [
    {
        mood: 'happy',
        emoji: '😊',
        label: 'Happy',
        description: 'Celebrate with something special!',
        keywords: ['special', 'seasonal', 'dessert', 'premium'],
    },
    {
        mood: 'stressed',
        emoji: '😰',
        label: 'Stressed',
        description: 'Comfort food to ease your mind',
        keywords: ['comfort', 'chai', 'coffee', 'warm', 'traditional'],
    },
    {
        mood: 'energetic',
        emoji: '⚡',
        label: 'Energetic',
        description: 'Fuel your energy with protein!',
        keywords: ['protein', 'fresh', 'salad', 'healthy', 'grilled'],
    },
    {
        mood: 'comfort',
        emoji: '🤗',
        label: 'Comfort',
        description: 'Warm, familiar favorites',
        keywords: ['traditional', 'warm', 'homestyle', 'classic'],
    },
    {
        mood: 'healthy',
        emoji: '🥗',
        label: 'Healthy',
        description: 'Light and nutritious options',
        keywords: ['vegan', 'salad', 'upwas', 'low-cal', 'fresh'],
    },
];

interface MoodRecommendationsProps {
    allItems: MenuItem[];
    onSelectItem?: (item: MenuItem) => void;
}

export const MoodRecommendations = ({ allItems, onSelectItem }: MoodRecommendationsProps) => {
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

    const getRecommendations = (mood: Mood): MenuItem[] => {
        const moodOption = moodOptions.find((m) => m.mood === mood);
        if (!moodOption) return [];

        // Filter items based on mood keywords
        const recommendations = allItems.filter((item) => {
            const itemText = `${item.name} ${item.description || ''}`.toLowerCase();
            return moodOption.keywords.some((keyword) => itemText.includes(keyword.toLowerCase()));
        });

        // Sort by rating and popularity
        return recommendations
            .sort((a, b) => {
                const scoreA = (a.avgRating || 0) * 0.5 + (a.ratingCount || 0) * 0.5; // used ratingCount as proxy for total_orders if not available
                const scoreB = (b.avgRating || 0) * 0.5 + (b.ratingCount || 0) * 0.5;
                return scoreB - scoreA;
            })
            .slice(0, 6);
    };

    const recommendations = selectedMood ? getRecommendations(selectedMood) : [];
    const selectedMoodOption = moodOptions.find((m) => m.mood === selectedMood);

    return (
        <div className="space-y-6">
            {/* Mood Selector */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-lg">How are you feeling?</h3>
                </div>

                <div className="grid grid-cols-5 gap-3">
                    {moodOptions.map((option) => (
                        <button
                            key={option.mood}
                            onClick={() => setSelectedMood(option.mood)}
                            className={cn(
                                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                                'hover:border-primary/50 hover:bg-primary/5',
                                selectedMood === option.mood
                                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                    : 'border-border bg-card'
                            )}
                        >
                            <span className="text-3xl">{option.emoji}</span>
                            <span className="text-xs font-medium text-center">{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recommendations */}
            {selectedMood && (
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-1">
                            {selectedMoodOption?.emoji} {selectedMoodOption?.label} Picks
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            {selectedMoodOption?.description}
                        </p>
                    </div>

                    {recommendations.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {recommendations.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSelectItem?.(item)}
                                    className="bg-card border border-border rounded-xl p-3 hover:border-primary/50 transition-all text-left group"
                                >
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-32 object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="w-full h-32 bg-muted rounded-lg mb-3 flex items-center justify-center">
                                            <span className="text-4xl">🍽️</span>
                                        </div>
                                    )}

                                    <h5 className="font-medium mb-1 line-clamp-1">{item.name}</h5>

                                    <div className="flex flex-col gap-0.5 mb-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-primary">
                                                ₹{item.discountPercent && item.discountPercent > 0
                                                    ? Math.round(item.price * (1 - item.discountPercent / 100))
                                                    : item.price}
                                            </span>
                                            {(item.avgRating || 0) > 0 && (
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    ⭐ {(item.avgRating || 0).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        {item.discountPercent && item.discountPercent > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground line-through">₹{item.price}</span>
                                                <span className="text-green-600 font-black text-xs uppercase">{item.discountPercent}% off</span>
                                            </div>
                                        )}
                                    </div>

                                    {item.isBestSeller && (
                                        <span className="inline-block text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                            🔥 BEST SELLER
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No recommendations found for this mood.</p>
                            <p className="text-sm">Try selecting a different mood!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
