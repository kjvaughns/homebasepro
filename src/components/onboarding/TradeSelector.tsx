import { useState } from "react";

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
  { key: 'contractor', label: 'Contractor', emoji: '🚪', hint: 'renovations & builds' }
];

interface TradeSelectorProps {
  selected: string | null;
  onSelect: (trade: string) => void;
}

export function TradeSelector({ selected, onSelect }: TradeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TRADES.map((trade) => (
        <button
          key={trade.key}
          onClick={() => onSelect(trade.key)}
          className={`rounded-xl p-3 text-center border transition-all duration-200 ${
            selected === trade.key 
              ? 'transform -translate-y-1' 
              : ''
          }`}
          style={{
            background: selected === trade.key 
              ? 'hsla(var(--onboarding-card))'
              : 'hsl(var(--card))',
            borderColor: selected === trade.key 
              ? 'hsla(var(--onboarding-green-glow))'
              : 'transparent',
            boxShadow: selected === trade.key 
              ? '0 6px 24px hsla(var(--onboarding-green-glow))'
              : 'none'
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
  );
}