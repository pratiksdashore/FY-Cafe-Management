import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Utensils, Coffee, Pizza, Salad, IceCream, Soup } from 'lucide-react';

interface Category {
    id: string | null;
    name: string;
    icon: React.ReactNode;
    color: string;
}

const categories: Category[] = [
    { id: null, name: 'All', icon: <Utensils className="w-4 h-4" />, color: 'bg-primary/10 text-primary' },
    { id: 'breakfast', name: 'Breakfast', icon: <Coffee className="w-4 h-4" />, color: 'bg-orange-500/10 text-orange-600' },
    { id: 'lunch', name: 'Lunch', icon: <Soup className="w-4 h-4" />, color: 'bg-green-500/10 text-green-600' },
    { id: 'snacks', name: 'Snacks', icon: <Pizza className="w-4 h-4" />, color: 'bg-yellow-500/10 text-yellow-600' },
    { id: 'beverages', name: 'Beverages', icon: <Coffee className="w-4 h-4" />, color: 'bg-blue-500/10 text-blue-600' },
    { id: 'desserts', name: 'Desserts', icon: <IceCream className="w-4 h-4" />, color: 'bg-pink-500/10 text-pink-600' },
    { id: 'healthy', name: 'Healthy', icon: <Salad className="w-4 h-4" />, color: 'bg-emerald-500/10 text-emerald-600' },
];

interface CategoryFilterProps {
    selectedCategory: string | null;
    onCategoryChange: (categoryId: string | null) => void;
    itemCounts?: Record<string, number>;
}

export const CategoryFilter = ({
    selectedCategory,
    onCategoryChange,
    itemCounts,
}: CategoryFilterProps) => {
    return (
        <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2 min-w-max px-1">
                {categories.map((category) => {
                    const isActive = selectedCategory === category.id;
                    const count = category.id ? itemCounts?.[category.id] : undefined;

                    return (
                        <button
                            key={category.id || 'all'}
                            onClick={() => onCategoryChange(category.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all',
                                'hover:scale-105 active:scale-95',
                                'whitespace-nowrap',
                                isActive
                                    ? `${category.color} border-current font-semibold shadow-md`
                                    : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                            )}
                        >
                            {category.icon}
                            <span className="text-sm">{category.name}</span>
                            {count !== undefined && count > 0 && (
                                <span
                                    className={cn(
                                        'text-xs px-1.5 py-0.5 rounded-full',
                                        isActive ? 'bg-white/20' : 'bg-muted'
                                    )}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
