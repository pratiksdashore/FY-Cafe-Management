import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Zap } from 'lucide-react';
import heroImage from '@/assets/hero-food.jpg';

interface HeroSectionProps {
  onExploreClick: () => void;
}

export const HeroSection = ({ onExploreClick }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Delicious food spread"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/90 via-espresso/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-xl animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm text-cream px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4 text-golden-amber" />
            <span className="text-sm font-medium">Quick Pre-Order System</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-cream mb-4 leading-tight">
            Skip the Queue,{' '}
            <span className="text-golden-amber">Grab & Go!</span>
          </h1>

          <p className="text-cream/80 text-lg md:text-xl mb-8 leading-relaxed">
            Pre-order your favorite meals, get a token, and pick up when it's ready. 
            No waiting, no hassle – just delicious food.
          </p>

          

          {/* CTA */}
          <Button
            size="lg"
            onClick={onExploreClick}
            className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-glow-primary"
          >
            Explore Menu
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="hidden lg:block absolute right-20 top-20 animate-bounce-gentle">
        <div className="w-16 h-16 rounded-2xl bg-card/90 backdrop-blur shadow-food-lg flex items-center justify-center">
          <span className="text-3xl">🍕</span>
        </div>
      </div>
      <div className="hidden lg:block absolute right-40 bottom-20 animate-bounce-gentle animation-delay-500">
        <div className="w-14 h-14 rounded-2xl bg-card/90 backdrop-blur shadow-food-lg flex items-center justify-center">
          <span className="text-2xl">🍔</span>
        </div>
      </div>
    </section>
  );
};
