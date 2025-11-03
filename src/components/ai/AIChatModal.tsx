import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import HomeBaseAI from "./HomeBaseAI";

interface AIChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: 'homeowner' | 'provider';
}

export function AIChatModal({ open, onOpenChange, userRole = 'provider' }: AIChatModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>HomeBase AI Assistant</DialogTitle>
          <DialogDescription>
            Get instant help with your business tasks and questions
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <HomeBaseAI userRole={userRole} autoFocus={true} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
