import { ReactNode } from "react";

interface OnboardingCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function OnboardingCard({ title, subtitle, children, className = "" }: OnboardingCardProps) {
  return (
    <div 
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: 'linear-gradient(180deg, hsla(var(--onboarding-card)), hsla(var(--onboarding-glass)))',
        boxShadow: '0 6px 24px rgba(2,6,23,0.6)',
        border: '1px solid hsla(var(--onboarding-border))',
        backdropFilter: 'blur(8px)'
      }}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-xl font-bold text-foreground mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}