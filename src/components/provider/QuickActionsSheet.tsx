import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FileText, Briefcase, UserPlus } from "lucide-react";
import { useState } from "react";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import CreateJobModal from "./CreateJobModal";
import { AddClientDialog } from "./AddClientDialog";

interface QuickActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickActionsSheet({ open, onOpenChange }: QuickActionsSheetProps) {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);

  const actions = [
    {
      title: "Create Job",
      description: "Schedule a new service appointment",
      icon: Briefcase,
      action: () => {
        onOpenChange(false);
        setShowJobModal(true);
      },
    },
    {
      title: "Send Invoice",
      description: "Generate and send a payment request",
      icon: FileText,
      action: () => {
        onOpenChange(false);
        setShowInvoiceModal(true);
      },
    },
    {
      title: "Add Client",
      description: "Add a new customer to your list",
      icon: UserPlus,
      action: () => {
        onOpenChange(false);
        setShowClientDialog(true);
      },
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Quick Actions</SheetTitle>
          </SheetHeader>
          <div className="grid gap-2 mt-4">
            {actions.map((action) => (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto py-4 px-4 justify-start gap-4"
                onClick={action.action}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modals */}
      <CreateInvoiceModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
      />
      <CreateJobModal
        open={showJobModal}
        onOpenChange={setShowJobModal}
        onSuccess={() => setShowJobModal(false)}
      />
      <AddClientDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        onSuccess={() => setShowClientDialog(false)}
      />
    </>
  );
}
