import { MenuItem } from '@/types/food';
import { MenuCard } from './MenuCard';
import { Flame } from 'lucide-react';

interface BestSellersProps {
  items: MenuItem[];
}

export const BestSellers = ({ items }: BestSellersProps) => {
  const bestSellers = items.filter((item) => item.isBestSeller).slice(0, 4);

  if (bestSellers.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-golden-amber/20 flex items-center justify-center">
          <Flame className="w-5 h-5 text-golden-amber" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl">Best Sellers</h2>
          <p className="text-muted-foreground text-sm">Most loved by our customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {bestSellers.map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
};
