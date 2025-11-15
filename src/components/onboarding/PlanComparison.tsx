interface PlanComparisonProps {
  selected: 'trial' | 'free';
  onSelect: (plan: 'trial' | 'free') => void;
}

export function PlanComparison({ selected, onSelect }: PlanComparisonProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={() => onSelect('trial')}
        className={`w-full text-left p-4 rounded-xl border transition-all ${
          selected === 'trial' ? 'scale-[1.02]' : ''
        }`}
        style={{
          background: 'hsl(var(--card))',
          borderColor: selected === 'trial' 
            ? 'hsla(var(--onboarding-green-glow))' 
            : 'hsla(var(--onboarding-border))',
          boxShadow: selected === 'trial' 
            ? '0 12px 44px hsla(var(--onboarding-green-glow))' 
            : 'none'
        }}
      >
        <h4 className="font-bold mb-2" style={{ color: 'hsl(var(--onboarding-text))' }}>
          14-day Pro Trial — full power ⚡
        </h4>
        <ul className="space-y-1 text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
          <li>✓ Unlimited jobs & clients</li>
          <li>✓ AI invoicing & estimates</li>
          <li>✓ Auto follow-ups & reminders</li>
          <li>✓ Earnings dashboard & priorities</li>
          <li>✓ Team management (up to 10)</li>
          <li>✓ 2% platform fee</li>
        </ul>
      </button>

      <button
        onClick={() => onSelect('free')}
        className={`w-full text-left p-4 rounded-xl border transition-all ${
          selected === 'free' ? 'scale-[1.02]' : ''
        }`}
        style={{
          background: 'hsl(var(--card))',
          borderColor: selected === 'free' 
            ? 'hsla(var(--onboarding-border))' 
            : 'hsla(var(--onboarding-border))'
        }}
      >
        <h4 className="font-bold mb-2" style={{ color: 'hsl(var(--onboarding-text))' }}>
          Limited Mode — free
        </h4>
        <ul className="space-y-1 text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
          <li>• Max 3 active jobs</li>
          <li>• No AI follow-ups</li>
          <li>• No instant payouts</li>
          <li>• No money dashboard</li>
          <li>• 8% platform fee</li>
        </ul>
      </button>
    </div>
  );
}