import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpCircle, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function SupportDrawer() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) {
      toast({
        title: 'Missing information',
        description: 'Please fill in both subject and message',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create support ticket in database
      await (supabase as any).from('support_tickets').insert({
        user_id: user?.id,
        subject,
        message,
        status: 'open',
      });

      // Open mailto link as fallback
      const mailtoLink = `mailto:support@homebaseproapp.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoLink;

      toast({
        title: 'Support request sent',
        description: "We'll get back to you within 24 hours",
      });

      setSubject('');
      setMessage('');
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send support request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="mr-2 h-4 w-4" />
          Help & Support
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Help & Support</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="font-semibold">Quick Help</h3>
            <Button variant="outline" className="w-full justify-start" onClick={() => window.open('/resources', '_blank')}>
              <MessageCircle className="mr-2 h-4 w-4" />
              View Resources
            </Button>
          </div>

          {/* Contact Form */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contact Support</h3>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question..."
                rows={6}
              />
            </div>
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We typically respond within 24 hours at<br />
              <a href="mailto:support@homebaseproapp.com" className="text-primary hover:underline">
                support@homebaseproapp.com
              </a>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
