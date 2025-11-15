import { ReactNode } from "react";

interface OnboardingCardProps {
  children: ReactNode;
  className?: string;
}

export function OnboardingCard({ children, className = "" }: OnboardingCardProps) {
  return (
    <div 
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: 'linear-gradient(180deg, hsla(var(--onboarding-card)), hsla(var(--onboarding-glass)))',
        boxShadow: '0 6px 24px rgba(2,6,23,0.6)',
        border: '1px solid hsla(var(--onboarding-border))',
        backdropFilter: 'blur(8px)'
      }}
    >
      {children}
    </div>
  );
}