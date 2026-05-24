import { useState, useMemo, useRef } from 'react';
import { Header } from '@/components/food/Header';
import { HeroSection } from '@/components/food/HeroSection';
import { CategoryPills } from '@/components/food/CategoryPills';
import { MenuCard } from '@/components/food/MenuCard';
import { BestSellers } from '@/components/food/BestSellers';
import { TodaySpecials } from '@/components/food/TodaySpecials';
import { CartDrawer } from '@/components/food/CartDrawer';
import { useMenuItems } from '@/hooks/useMenu';
import { Clock, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { orderService, authService, recommendationService } from '@/services/supabase';
import { geminiService } from '@/services/gemini';
import { MenuItem } from '@/types/food';
import { useEffect } from 'react';
import { xgboostService } from '@/services/xgboost';


const HomePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { items: menuItems, loading } = useMenuItems();
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        console.log("Fetching recommendations...");
        const user = await authService.getCurrentUser();
        if (!user) return;

        setRecommendationsLoading(true);

        // Fetch recommendations from XGBoost in the background (code present as requested)
        try {
          await xgboostService.getRecommendations(user.id);
        } catch (xgBoostError) {
          console.error("XGBoost background fetch failed:", xgBoostError);
        }

        try {
          const orders = await orderService.getUserOrders(user.id);

          // Extract unique item names from order history
          const historyNames = Array.from(new Set(
            orders.flatMap(order =>
              (order.order_items || []).map((oi: any) => oi.menu_item_data?.name)
            )
          )).filter(Boolean) as string[];

          // Available menu item names
          const availableNames = menuItems.map(item => item.name);

          if (availableNames.length > 0) {
            const recommendedNames = await geminiService.getPersonalizedRecommendations(historyNames, availableNames);

            if (recommendedNames.length > 0) {
              // Save to Supabase for future fallback
              await recommendationService.saveUserRecommendations(user.id, recommendedNames);

              // Map recommended names back to MenuItems
              const recommendedItems = recommendedNames
                .map(name => menuItems.find(item => item.name === name))
                .filter(Boolean) as MenuItem[];

              setRecommendations(recommendedItems);
              return; // Success
            }
          }
        } catch (geminiError) {
          console.error("Gemini recommendation failed, falling back to database:", geminiError);
        }

        // Fallback: Fetch from stored recommendations in Supabase
        const storedNames = await recommendationService.getStoredRecommendations(user.id);
        if (storedNames.length > 0) {
          const fallbackItems = storedNames
            .map(name => menuItems.find(item => item.name === name))
            .filter(Boolean) as MenuItem[];
          setRecommendations(fallbackItems);
        }
      } catch (error) {
        console.error("Error in fetchRecommendations:", error);
      } finally {
        setRecommendationsLoading(false);
      }
    };

    if (menuItems.length > 0) {
      fetchRecommendations();
    }
  }, [menuItems]);

  // Derive categories dynamically from the live items
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const cats = [{ id: 'all', name: 'All', icon: '🍽️', count: menuItems.length }];
    menuItems.forEach((item) => {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        cats.push({ id: item.category, name: item.category, icon: '🍴', count: menuItems.filter(i => i.category === item.category).length });
      }
    });
    return cats;
  }, [menuItems]);


  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return items;
  }, [menuItems, selectedCategory, searchQuery]);


  const scrollToMenu = () => {
    menuRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onCartClick={() => setCartOpen(true)}
        onSearchChange={setSearchQuery}
      />

      {/* Hero */}
      <HeroSection onExploreClick={scrollToMenu} />

      <main className="container mx-auto px-4 py-6">
        {/* Best Sellers */}
        <BestSellers items={menuItems} />

        {/* Today's Specials */}
        <TodaySpecials items={menuItems} />

        {/* Personalized Recommendations */}
        {(recommendationsLoading || recommendations.length > 0) && (
          <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl">Recommended for You</h2>
                <p className="text-muted-foreground text-sm">
                  {recommendationsLoading ? "Analyzing your taste..." : "Based on your order history"}
                </p>
              </div>
            </div>

            {recommendationsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={`skeleton-${i}`} className="h-64 rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recommendations.map((item) => (
                  <MenuCard key={`rec-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Idle Time Suggestion */}
        <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Skip the Rush!</h4>
            <p className="text-muted-foreground text-sm">
              Order for pickup at <span className="font-medium text-secondary">3:00 PM - 4:00 PM</span> for
              minimal wait time. Currently less crowded! 🎯
            </p>
          </div>
        </div>

        {/* Menu Section */}
        <section ref={menuRef} id="menu" className="scroll-mt-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-2xl">Full Menu</h2>
            
          </div>

          {/* Categories */}
          <CategoryPills
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />

          {/* Menu Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
              {filteredItems.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">No items found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter to find what you're looking for
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Footer */}
      <footer className="bg-muted mt-12 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-golden-amber flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
            <span className="font-display font-bold text-xl">QuickBite</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Pre-order your meals and skip the queue. Fast, fresh, and hassle-free!
          </p>
          <p className="text-muted-foreground text-xs mt-4">
            © 2024 QuickBite. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

const Index = () => {
  return <HomePage />;
};

export default Index;
