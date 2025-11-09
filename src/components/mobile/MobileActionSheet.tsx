import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDespia } from '@/hooks/useDespia';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface ActionItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

interface MobileActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actions: ActionItem[];
}

export function MobileActionSheet({
  open,
  onOpenChange,
  title,
  actions,
}: MobileActionSheetProps) {
  const { triggerHaptic } = useDespia();

  const handleAction = (action: ActionItem) => {
    triggerHaptic('light');
    action.onClick();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[60vh] rounded-t-3xl border-0 pb-safe"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center text-base font-semibold">{title}</SheetTitle>
        </SheetHeader>
        
        <div className="grid gap-2 px-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                onClick={() => handleAction(action)}
                className="flex items-center justify-start gap-3 h-14 text-left"
              >
                <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium text-sm">{action.label}</span>
              </Button>
            );
          })}
          
          <Button
            variant="ghost"
            onClick={() => {
              triggerHaptic('light');
              onOpenChange(false);
            }}
            className="mt-2 h-14"
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
