import { CheckCircle2 } from "lucide-react";

interface PlanComparisonProps {
  selected: 'trial' | 'free';
  onSelect: (plan: 'trial' | 'free') => void;
}

export function PlanComparison({ selected, onSelect }: PlanComparisonProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={() => onSelect('trial')}
        className={`relative w-full text-left p-5 rounded-xl border-2 transition-all duration-300 ${
          selected === 'trial' 
            ? 'scale-[1.02] border-primary shadow-2xl shadow-primary/30' 
            : 'border-border/50 hover:border-border'
        }`}
        style={{
          background: selected === 'trial' 
            ? 'hsl(var(--primary) / 0.1)' 
            : 'hsl(var(--card))',
        }}
      >
        {selected === 'trial' && (
          <div className="absolute top-3 right-3">
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              SELECTED
            </div>
          </div>
        )}
        <h4 className="font-bold mb-1 text-foreground text-base">
          7-Day Pro Trial — full power ⚡
        </h4>
        <p className="text-xs text-muted-foreground mb-3">Card required • No charge until day 8</p>
        <ul className="space-y-1.5 text-xs text-foreground">
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Unlimited jobs & clients</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>AI invoicing & estimates</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Auto follow-ups & reminders</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Earnings dashboard & priorities</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Team management (up to 10)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>2% platform fee</span>
          </li>
        </ul>
      </button>

      <button
        onClick={() => onSelect('free')}
        className={`relative w-full text-left p-5 rounded-xl border-2 transition-all duration-300 ${
          selected === 'free' 
            ? 'scale-[1.02] border-primary shadow-lg' 
            : 'border-border/50 hover:border-border'
        }`}
        style={{
          background: selected === 'free' 
            ? 'hsl(var(--primary) / 0.05)' 
            : 'hsl(var(--card))',
        }}
      >
        {selected === 'free' && (
          <div className="absolute top-3 right-3">
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              SELECTED
            </div>
          </div>
        )}
        <h4 className="font-bold mb-1 text-foreground text-base">
          Free Plan — no card needed
        </h4>
        <p className="text-xs text-muted-foreground mb-3">Start free, upgrade anytime</p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>Max 3 active jobs</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>No AI follow-ups</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>No instant payouts</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>No money dashboard</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>8% platform fee</span>
          </li>
        </ul>
      </button>
    </div>
  );
}