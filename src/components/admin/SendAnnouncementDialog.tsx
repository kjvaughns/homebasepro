import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, Mail } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  body: z.string().min(1, "Message is required").max(500),
  target_audience: z.enum(["all", "providers", "homeowners"]),
  priority: z.enum(["low", "normal", "high"]),
  expires_at: z.string().optional(),
  send_push: z.boolean(),
  send_email: z.boolean(),
});

interface SendAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendAnnouncementDialog({
  open,
  onOpenChange,
}: SendAnnouncementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      body: "",
      target_audience: "all",
      priority: "normal",
      expires_at: "",
      send_push: true,
      send_email: false,
    },
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    console.log('📝 Form submitted with values:', {
      ...values,
      send_push: values.send_push,
      send_email: values.send_email,
    });
    setPendingValues(values);
    setShowConfirmation(true);
  };

  const confirmSend = useCallback(async () => {
    if (!pendingValues) return;
    
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    console.log('🚀 Sending announcement with final values:', {
      send_push: pendingValues.send_push,
      send_email: pendingValues.send_email,
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: {
          title: pendingValues.title,
          body: pendingValues.body,
          target_audience: pendingValues.target_audience,
          priority: pendingValues.priority,
          expires_at: pendingValues.expires_at || null,
          send_push: pendingValues.send_push,
          send_email: pendingValues.send_email,
        },
      });

      if (error) throw error;

      const emailStats = data.emails_sent !== undefined 
        ? ` (${data.emails_sent} emails sent${data.emails_failed ? `, ${data.emails_failed} failed` : ''})` 
        : '';

      toast({
        title: "Announcement sent",
        description: `Sent to ${data.recipients} users${emailStats}`,
      });

      form.reset();
      setPendingValues(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to send announcement:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send announcement",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingValues, form, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Announcement</DialogTitle>
          <DialogDescription>
            Send a notification to all users or specific user types
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Important Update" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Your announcement message..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value.length}/500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="providers">Providers Only</SelectItem>
                      <SelectItem value="homeowners">Homeowners Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="send_push"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 min-h-[80px] cursor-pointer active:bg-accent/50 transition-colors"
                  onClick={() => {
                    const newValue = !field.value;
                    field.onChange(newValue);
                    console.log('🔔 Push toggle clicked:', newValue);
                  }}
                >
                  <div className="space-y-0.5 flex-1 pointer-events-none">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Bell className={`h-4 w-4 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      Send Push Notification
                      {field.value && <span className="text-xs text-primary">(enabled)</span>}
                    </FormLabel>
                    <FormDescription>
                      Also send as push notification to users' devices
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        console.log('🔔 Push switch changed:', checked);
                      }}
                      className="pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="send_email"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 min-h-[80px] cursor-pointer active:bg-accent/50 transition-colors"
                  onClick={() => {
                    const newValue = !field.value;
                    field.onChange(newValue);
                    console.log('📧 Email toggle clicked:', newValue);
                  }}
                >
                  <div className="space-y-0.5 flex-1 pointer-events-none">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Mail className={`h-4 w-4 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      Send via Email
                      {field.value && <span className="text-xs text-primary">(enabled)</span>}
                    </FormLabel>
                    <FormDescription>
                      Send branded announcement emails to users' inboxes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        console.log('📧 Email switch changed:', checked);
                      }}
                      className="pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Announcement
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Announcement</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>You're about to send this announcement:</div>
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <div><strong>Title:</strong> {pendingValues?.title}</div>
                <div><strong>Audience:</strong> {pendingValues?.target_audience}</div>
                <div className="pt-2 border-t">
                  <strong>Channels:</strong>
                  <div className="flex flex-col gap-1 mt-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Bell className="h-3 w-3" />
                      In-App: <span className="text-primary font-medium">Always enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="h-3 w-3" />
                      Push: <span className={pendingValues?.send_push ? "text-primary font-medium" : "text-muted-foreground"}>
                        {pendingValues?.send_push ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email: <span className={pendingValues?.send_email ? "text-primary font-medium" : "text-muted-foreground"}>
                        {pendingValues?.send_email ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSend} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
