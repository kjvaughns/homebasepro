import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface FollowUp {
  id: string;
  action_type: string;
  booking_id: string;
  bookings: {
    service_name: string;
  } | null;
  organizations: {
    name: string | null;
  } | null;
}

export function FollowUpDialog() {
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkForPendingFollowUp();

    // Set up realtime subscription for new follow-ups
    const channel = supabase
      .channel('follow_up_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'follow_up_actions',
          filter: 'status=eq.sent'
        },
        () => {
          checkForPendingFollowUp();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkForPendingFollowUp = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('follow_up_actions')
        .select('*, bookings(service_name), organizations(name)')
        .eq('homeowner_id', profile.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching follow-up:', error);
        return;
      }

      if (data) {
        setFollowUp(data);
      }
    } catch (error) {
      console.error('Error checking for follow-up:', error);
    }
  };

  const handleSubmit = async () => {
    if (!followUp) return;

    setIsSubmitting(true);
    try {
      const responseData = {
        rating: followUp.action_type === 'satisfaction_check' ? rating : undefined,
        feedback: feedback || undefined,
        responded_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('follow_up_actions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          response_data: responseData
        })
        .eq('id', followUp.id);

      if (error) throw error;

      toast.success('Thank you for your feedback!');
      setFollowUp(null);
      setRating(0);
      setFeedback("");
    } catch (error) {
      console.error('Error submitting follow-up:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!followUp) return;

    try {
      const { error } = await supabase
        .from('follow_up_actions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', followUp.id);

      if (error) throw error;

      setFollowUp(null);
      setRating(0);
      setFeedback("");
    } catch (error) {
      console.error('Error dismissing follow-up:', error);
    }
  };

  const getTitle = () => {
    switch (followUp?.action_type) {
      case 'satisfaction_check':
        return 'How was your service?';
      case 'request_review':
        return 'Share your experience';
      case 'rebook_service':
        return 'Need this service again?';
      default:
        return 'Feedback';
    }
  };

  const getDescription = () => {
    switch (followUp?.action_type) {
      case 'satisfaction_check':
        return `We'd love to hear about your recent ${followUp.bookings?.service_name} service with ${followUp.organizations?.name}.`;
      case 'request_review':
        return `Help others by sharing your experience with ${followUp.organizations?.name}.`;
      case 'rebook_service':
        return `It's been a while since your last ${followUp.bookings?.service_name} service. Ready to book again?`;
      default:
        return '';
    }
  };

  if (!followUp) return null;

  return (
    <Dialog open={!!followUp} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {followUp.action_type === 'satisfaction_check' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Rate your experience</label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {followUp.action_type === 'satisfaction_check' ? 'Additional feedback (optional)' : 'Your review'}
            </label>
            <Textarea
              placeholder="Tell us about your experience..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1"
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={
              isSubmitting ||
              (followUp.action_type === 'satisfaction_check' && rating === 0)
            }
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
