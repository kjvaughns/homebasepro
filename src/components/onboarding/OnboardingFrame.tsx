import { ReactNode } from "react";

interface OnboardingFrameProps {
  children: ReactNode;
  theme?: 'light' | 'dark';
}

export function OnboardingFrame({ children, theme = 'dark' }: OnboardingFrameProps) {
  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 md:p-8 ${theme}`}
      style={{ 
        background: 'linear-gradient(180deg, hsl(var(--onboarding-bg-start)), hsl(var(--onboarding-bg-end)))' 
      }}
    >
      <div className="w-full max-w-md mx-auto">
        <div className="relative rounded-[36px] overflow-hidden"
             style={{
               background: 'linear-gradient(180deg, hsla(var(--onboarding-glass)), hsla(0, 0%, 0%, 0.05))',
               boxShadow: '0 20px 50px rgba(2,6,23,0.7), 0 0 60px hsla(var(--onboarding-green-glow))',
               border: '1px solid hsla(var(--onboarding-border))'
             }}>
          {children}
        </div>
      </div>
    </div>
  );
}