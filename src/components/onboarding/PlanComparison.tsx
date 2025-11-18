import { Check } from "lucide-react";

interface PlanComparisonProps {
  selected: 'starter' | 'free';
  onSelect: (plan: 'starter' | 'free') => void;
}

export function PlanComparison({ selected, onSelect }: PlanComparisonProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Starter Plan */}
      <button
        onClick={() => onSelect('starter')}
        className={`
          relative border-2 rounded-xl p-6 text-left transition-all
          ${selected === 'starter' 
            ? 'scale-[1.02] border-primary shadow-2xl shadow-primary/30' 
            : 'border-border hover:border-primary/50'
          }
        `}
      >
        {selected === 'starter' && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
            Recommended
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">Starter</h3>
            <div className="mt-2">
              <span className="text-lg line-through text-muted-foreground">$30/mo</span>
              <p className="text-4xl font-bold text-primary">$15/mo</p>
              <p className="text-sm text-primary font-medium">Beta: 50% off</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">7-day free trial, card required</p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-sm">Perfect for growing businesses:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>Unlimited jobs</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>4% transaction fee (vs 8% on free)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>3 team seats</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>AI-powered features</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>Automated workflows</span>
              </li>
            </ul>
          </div>
        </div>
      </button>

      {/* Free Plan */}
      <button
        onClick={() => onSelect('free')}
        className={`
          relative border-2 rounded-xl p-6 text-left transition-all
          ${selected === 'free' 
            ? 'scale-[1.02] border-primary shadow-lg' 
            : 'border-border hover:border-primary/50'
          }
        `}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">Free</h3>
            <p className="text-4xl font-bold text-primary">$0/mo</p>
            <p className="text-sm text-muted-foreground mt-2">Try before you commit</p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-sm">Great for getting started:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>Up to 5 completed jobs/month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>8% transaction fee</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>Core features</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <span>Basic support</span>
              </li>
            </ul>
          </div>
        </div>
      </button>
    </div>
  );
}