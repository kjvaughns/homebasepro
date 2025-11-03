import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle } from 'lucide-react';
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
            <div>
              <h3 className="font-semibold mb-2">Get Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the best support option for your situation
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    try {
                      if (typeof window !== 'undefined' && (window as any).Intercom) {
                        (window as any).Intercom('show');
                      }
                    } catch (error) {
                      console.error('Error opening Intercom:', error);
                    }
                  }}
                  variant="default"
                  className="w-full"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Live Chat (Urgent Issues)
                </Button>
                <Button 
                  onClick={() => setShowTicketForm(true)}
                  variant="outline"
                  className="w-full"
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Create Support Ticket (24hr)
                </Button>
              </div>
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
