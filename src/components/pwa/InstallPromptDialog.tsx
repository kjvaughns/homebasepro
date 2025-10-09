import { Share, Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface InstallPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallPromptDialog({
  open,
  onOpenChange,
  isIOS,
  onInstall,
  onDismiss
}: InstallPromptDialogProps) {
  const handleInstall = () => {
    onInstall();
    onOpenChange(false);
  };

  const handleDismiss = () => {
    onDismiss();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install HomeBase</DialogTitle>
          <DialogDescription>
            {isIOS
              ? 'Add HomeBase to your home screen for quick access'
              : 'Install HomeBase for a better experience'}
          </DialogDescription>
        </DialogHeader>

        {isIOS ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Share className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-muted-foreground">
                  Located at the bottom of Safari
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Select "Add to Home Screen"</p>
                <p className="text-sm text-muted-foreground">
                  Scroll down if you don't see it
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Tap "Add"</p>
                <p className="text-sm text-muted-foreground">
                  HomeBase will appear on your home screen
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Installing HomeBase gives you quick access, offline support, and a native app experience.
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={handleDismiss}>
            Remind me later
          </Button>
          {!isIOS && (
            <Button onClick={handleInstall}>
              Install HomeBase
            </Button>
          )}
          {isIOS && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
