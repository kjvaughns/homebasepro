export function OnboardingHeader() {
  return (
    <header className="h-[84px] flex items-center gap-3 px-5 border-b"
            style={{ 
              borderColor: 'hsla(var(--onboarding-border))',
              backdropFilter: 'blur(6px)',
              background: 'linear-gradient(180deg, hsla(var(--onboarding-glass)), transparent)'
            }}>
      <div className="flex items-center justify-center w-11 h-11 rounded-xl font-extrabold text-lg"
           style={{
             background: 'linear-gradient(135deg, hsl(var(--onboarding-green)), hsl(var(--accent)))',
             boxShadow: '0 6px 24px hsla(var(--onboarding-green-glow)), inset 0 -6px 18px hsla(0, 0%, 100%, 0.06)',
             color: '#111'
           }}>
        HB
      </div>
      <div>
        <h4 className="text-[15px] font-semibold tracking-wide" style={{ color: 'hsl(var(--onboarding-text))' }}>
          HomeBase Pro
        </h4>
        <p className="text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
          AI-assisted setup • 3 minutes
        </p>
      </div>
    </header>
  );
}