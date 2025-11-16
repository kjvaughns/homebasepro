import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Briefcase, UserPlus, Clock } from "lucide-react";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: 'existing' | 'new' | 'block') => void;
}

export function QuickAddSheet({ open, onOpenChange, onSelectMode }: QuickAddSheetProps) {
  const handleSelect = (mode: 'existing' | 'new' | 'block') => {
    onSelectMode(mode);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Quick Add</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-6">
          <Button 
            variant="outline" 
            className="w-full justify-start h-20 text-left"
            onClick={() => handleSelect('existing')}
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Add Job for Existing Client</p>
                <p className="text-sm text-muted-foreground">Quick schedule</p>
              </div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start h-20 text-left"
            onClick={() => handleSelect('new')}
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Add New Client + Job</p>
                <p className="text-sm text-muted-foreground">Onboard & schedule</p>
              </div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start h-20 text-left"
            onClick={() => handleSelect('block')}
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Block Off Time</p>
                <p className="text-sm text-muted-foreground">Personal / unavailable</p>
              </div>
            </div>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
