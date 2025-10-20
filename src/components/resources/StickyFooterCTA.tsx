import { Button } from "@/components/ui/button";

interface StickyFooterCTAProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  trackingId?: string;
}

export function StickyFooterCTA({ text, onClick, disabled, trackingId }: StickyFooterCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border shadow-lg md:hidden z-50">
      <Button
        onClick={onClick}
        disabled={disabled}
        className="w-full"
        size="lg"
        data-track={trackingId}
      >
        {text}
      </Button>
    </div>
  );
}
