import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  onComplete: () => void;
}

export function JobCompletionModal({ open, onOpenChange, job, onComplete }: JobCompletionModalProps) {
  const [loading, setLoading] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [finalPrice, setFinalPrice] = useState(job?.estimated_price_low || "");
  const [hoursWorked, setHoursWorked] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }
    
    setPhotos(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviewUrls(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (!completionNotes.trim()) {
      toast.error("Please add completion notes");
      return;
    }

    setLoading(true);
    try {
      // Check job limit before proceeding
      const { data: canComplete } = await supabase.rpc('can_complete_job', {
        p_provider_org_id: job.provider_org_id
      });

      if (!canComplete) {
        toast.error("You've reached your free plan limit of 5 completed jobs. Upgrade to continue.");
        setLoading(false);
        return;
      }
      // Upload photos to storage
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const filename = `${job.id}/${Date.now()}-${photo.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('provider-images')
          .upload(filename, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('provider-images')
          .getPublicUrl(filename);
        
        photoUrls.push(publicUrl);
      }

      // Update booking with completion data
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          completion_notes: completionNotes,
          completion_photos: photoUrls,
          final_price: finalPrice ? parseInt(finalPrice) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      // Increment job completion count (for free plan limits)
      await supabase.rpc('increment_job_completion', {
        p_provider_org_id: job.provider_org_id
      });

      // Generate and send receipt
      const { error: receiptError } = await supabase.functions.invoke('generate-receipt', {
        body: {
          bookingId: job.id,
          completionNotes,
          hoursWorked,
          materialsUsed,
          finalPrice,
          photoUrls
        }
      });

      if (receiptError) {
        console.error("Receipt generation failed:", receiptError);
        // Don't fail the whole completion if receipt fails
        toast.error("Job completed but receipt failed to send");
      }

      // Schedule review request (48 hours from now)
      // Get homeowner's user_id for notification
      const { data: homeownerProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', job.homeowner_profile_id)
        .single();

      if (homeownerProfile?.user_id) {
        await supabase.functions.invoke('dispatch-notification', {
          body: {
            type: 'review_request',
            userId: homeownerProfile.user_id,
            role: 'homeowner',
            title: '⭐ How did we do?',
            body: `Please rate your ${job.service_name} experience`,
            actionUrl: `/reviews/submit/${job.id}`,
            metadata: {
              jobId: job.id,
              serviceName: job.service_name,
              scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            }
          }
        });
      }

      toast.success("Job completed successfully!");
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error completing job:", error);
      toast.error(error.message || "Failed to complete job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Job</DialogTitle>
          <DialogDescription>
            Add completion details for {job?.service_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="completion-notes">Completion Notes *</Label>
            <Textarea
              id="completion-notes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Describe what was completed, any issues found, recommendations..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="final-price">Final Price ($)</Label>
              <Input
                id="final-price"
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder="Enter final amount"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hours-worked">Hours Worked</Label>
              <Input
                id="hours-worked"
                type="number"
                step="0.5"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                placeholder="e.g., 2.5"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="materials-used">Materials/Parts Used</Label>
            <Textarea
              id="materials-used"
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              placeholder="List any materials or parts used..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Completion Photos (Optional, max 5)</Label>
            <div className="mt-2 space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  disabled={photos.length >= 5}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photos
                </Button>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={loading || !completionNotes.trim()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete & Send Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
