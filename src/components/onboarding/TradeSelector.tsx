import { useState } from "react";
import { Input } from "@/components/ui/input";

interface Trade {
  key: string;
  label: string;
  emoji: string;
  hint: string;
}

const TRADES: Trade[] = [
  { key: 'plumbing', label: 'Plumber', emoji: '💧', hint: 'drains, faucets, installs' },
  { key: 'cleaning', label: 'Cleaner', emoji: '🧼', hint: 'residential & commercial' },
  { key: 'handyman', label: 'Handyman', emoji: '🔨', hint: 'repairs & small jobs' },
  { key: 'lawn', label: 'Lawn Care', emoji: '🌿', hint: 'mowing, cleanup, mulching' },
  { key: 'painting', label: 'Painter', emoji: '🎨', hint: 'interior & exterior' },
  { key: 'hvac', label: 'HVAC', emoji: '❄️', hint: 'maintenance & service' },
  { key: 'electrical', label: 'Electrician', emoji: '⚡', hint: 'wiring, repairs, installs' },
  { key: 'contractor', label: 'Contractor', emoji: '🚪', hint: 'renovations & builds' },
  { key: 'other', label: 'Other', emoji: '🔧', hint: 'specify your trade' }
];

interface TradeSelectorProps {
  selected: string | null;
  onSelect: (trade: string) => void;
  customTrade?: string;
  onCustomTradeChange?: (value: string) => void;
}

export function TradeSelector({ selected, onSelect, customTrade, onCustomTradeChange }: TradeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {TRADES.map((trade) => (
          <button
            key={trade.key}
            onClick={() => onSelect(trade.key)}
            className={`rounded-xl p-3 text-center border-2 transition-all duration-200 ${
              selected === trade.key 
                ? 'transform -translate-y-1 border-primary shadow-lg' 
                : 'border-border/50 hover:border-border'
            }`}
            style={{
              background: selected === trade.key 
                ? 'hsl(var(--primary) / 0.1)'
                : 'hsl(var(--card))',
            }}
          >
            <div className="text-2xl mb-2">{trade.emoji}</div>
            <h5 className="text-sm font-bold" style={{ color: 'hsl(var(--onboarding-text))' }}>
              {trade.label}
            </h5>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--onboarding-muted))' }}>
              {trade.hint}
            </p>
          </button>
        ))}
      </div>
      
      {selected === 'other' && (
        <div className="mt-4 p-4 rounded-xl border-2 border-primary/50 bg-primary/5">
          <label className="text-sm font-semibold mb-2 block" style={{ color: 'hsl(var(--onboarding-text))' }}>
            What's your trade?
          </label>
          <Input
            value={customTrade || ''}
            onChange={(e) => onCustomTradeChange?.(e.target.value)}
            placeholder="e.g., Landscaping, Roofing, Pest Control..."
            className="bg-background"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}