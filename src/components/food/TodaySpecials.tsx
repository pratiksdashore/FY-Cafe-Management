import { MenuItem } from '@/types/food';
import { MenuCard } from './MenuCard';
import { Sparkles } from 'lucide-react';

interface TodaySpecialsProps {
  items: MenuItem[];
}

export const TodaySpecials = ({ items }: TodaySpecialsProps) => {
  const specials = items.filter((item) => item.isTodaySpecial);

  if (specials.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl">Today's Specials</h2>
          <p className="text-muted-foreground text-sm">Chef's recommendations for today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {specials.map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
};
