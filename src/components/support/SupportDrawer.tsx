import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { HelpCircle, Bot, MessageCircle } from 'lucide-react';
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
