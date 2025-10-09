import { Bell } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PushPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnable: () => void;
  isIOS: boolean;
  isInstalled: boolean;
}

export function PushPermissionDialog({
  open,
  onOpenChange,
  onEnable,
  isIOS,
  isInstalled
}: PushPermissionDialogProps) {
  const handleEnable = () => {
    onEnable();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <AlertDialogTitle>Enable Notifications</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {isIOS && !isInstalled ? (
              <>
                <p>
                  Push notifications are only available when HomeBase is installed to your home screen.
                </p>
                <p className="font-medium text-foreground">
                  Please install HomeBase first, then enable notifications.
                </p>
              </>
            ) : (
              <>
                <p>
                  Stay up to date with important updates about your home services:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Appointment reminders</li>
                  <li>Service completion updates</li>
                  <li>New messages from providers</li>
                  <li>Billing and payment notifications</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  You can disable notifications anytime in settings.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          {(!isIOS || isInstalled) && (
            <AlertDialogAction onClick={handleEnable}>
              Enable Notifications
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
