import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SendAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientEmail: string;
  recipientName: string;
}

export function SendAnnouncementModal({
  open,
  onOpenChange,
  recipientEmail,
  recipientName,
}: SendAnnouncementModalProps) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: org } = await supabase
        .from("organizations")
        .select("id, business_name")
        .eq("owner_id", user.id)
        .single();

      if (!org) throw new Error("Organization not found");

      // Create announcement record
      const { error } = await supabase.from("announcements").insert({
        title: subject,
        body: message,
        target_audience: "specific",
        send_via: "email",
        created_by: user.id,
        filters: {
          recipients: [recipientEmail]
        }
      });

      if (error) throw error;

      toast.success(`Message sent to ${recipientName}`);
      onOpenChange(false);
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Error sending announcement:", error);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Send Update to {recipientName}</DialogTitle>
          <DialogDescription>
            Send a custom email update to this client
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Job update, reminder, etc."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
