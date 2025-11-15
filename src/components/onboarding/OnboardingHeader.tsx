import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingHeaderProps {
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
}

export function OnboardingHeader({ theme = 'dark', onThemeToggle }: OnboardingHeaderProps) {
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
      <div className="flex-1">
        <h4 className="text-[15px] font-semibold tracking-wide" style={{ color: 'hsl(var(--onboarding-text))' }}>
          HomeBase Pro
        </h4>
        <p className="text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
          AI-assisted setup • 3 minutes
        </p>
      </div>
      {onThemeToggle && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeToggle}
          className="h-9 w-9"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" style={{ color: 'hsl(var(--onboarding-text))' }} />
          ) : (
            <Moon className="h-4 w-4" style={{ color: 'hsl(var(--onboarding-text))' }} />
          )}
        </Button>
      )}
    </header>
  );
}