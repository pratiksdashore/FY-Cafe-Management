import { Category } from '@/types/food';
import { cn } from '@/lib/utils';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategory: string;
  onSelect: (categoryId: string) => void;
}

export const CategoryPills = ({ categories, selectedCategory, onSelect }: CategoryPillsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-2 px-1">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 font-medium text-sm",
            selectedCategory === category.id
              ? "bg-primary text-primary-foreground shadow-glow-primary"
              : "bg-card hover:bg-muted text-foreground border border-border"
          )}
        >
          <span>{category.icon}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
};
