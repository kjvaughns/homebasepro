interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const percent = Math.max(6, Math.round((currentStep / (totalSteps - 1)) * 100));
  
  return (
    <div className="h-2 w-full rounded-full overflow-hidden"
         style={{ background: 'hsla(var(--onboarding-glass))' }}>
      <div 
        className="h-full transition-all duration-400 ease-out"
        style={{ 
          width: `${percent}%`,
          background: 'linear-gradient(90deg, hsl(var(--onboarding-green)), hsl(var(--accent)))' 
        }}
      />
    </div>
  );
}