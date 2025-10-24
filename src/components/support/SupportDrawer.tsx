import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { HelpCircle, Bot } from 'lucide-react';
import HomeBaseAI from '@/components/ai/HomeBaseAI';
import { CreateTicketDialog } from './CreateTicketDialog';

export function SupportDrawer() {
  const [open, setOpen] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Help & Support</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* AI First Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Ask HomeBase AI First</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                I can help troubleshoot issues, answer questions about features, and guide you through platform tasks.
              </p>
              <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                <HomeBaseAI autoFocus />
              </div>
            </div>

            <Separator />

            {/* Create Ticket Section */}
            <div>
              <h3 className="font-semibold mb-2">Still Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a support ticket and our team will respond within 24 hours.
              </p>
              <Button 
                onClick={() => setShowTicketForm(true)}
                variant="outline"
                className="w-full"
              >
                Create Support Ticket
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CreateTicketDialog 
        open={showTicketForm}
        onOpenChange={setShowTicketForm}
      />
    </>
  );
}
