import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, FileText, Plus, X, Sparkles } from "lucide-react";

interface DiagnosisFormProps {
  serviceCallId: string;
  onSuccess?: () => void;
}

export function DiagnosisForm({ serviceCallId, onSuccess }: DiagnosisFormProps) {
  const navigate = useNavigate();
  const [diagnosisSummary, setDiagnosisSummary] = useState("");
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [recommendedActions, setRecommendedActions] = useState<string[]>([""]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

  const handleAddAction = () => {
    setRecommendedActions([...recommendedActions, ""]);
  };

  const handleRemoveAction = (index: number) => {
    setRecommendedActions(recommendedActions.filter((_, i) => i !== index));
  };

  const handleActionChange = (index: number, value: string) => {
    const newActions = [...recommendedActions];
    newActions[index] = value;
    setRecommendedActions(newActions);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${serviceCallId}/${crypto.randomUUID()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('service-call-photos')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('service-call-photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setPhotos([...photos, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} photo(s) uploaded`);
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error("Failed to upload photos");
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleCompleteDiagnosis = async () => {
    if (!diagnosisSummary.trim()) {
      toast.error("Please provide a diagnosis summary");
      return;
    }

    setIsSubmitting(true);

    try {
      const validActions = recommendedActions.filter(a => a.trim() !== "");
      const photoObjects = photos.map(url => ({ url }));

      const { error } = await supabase
        .from("service_calls")
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          diagnosis_summary: diagnosisSummary,
          technician_notes: technicianNotes || null,
          recommended_actions: validActions,
          photos: photoObjects
        })
        .eq("id", serviceCallId);

      if (error) throw error;

      toast.success("Diagnosis completed successfully!");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error completing diagnosis:", error);
      toast.error("Failed to complete diagnosis");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateQuote = async () => {
    if (!diagnosisSummary.trim()) {
      toast.error("Please complete the diagnosis first");
      return;
    }

    setIsGeneratingQuote(true);

    try {
      // First complete the diagnosis
      await handleCompleteDiagnosis();

      // Then navigate to quote creation
      navigate(`/provider/service-calls/${serviceCallId}/quote`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to proceed to quote generation");
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Complete Diagnosis
        </CardTitle>
        <CardDescription>
          Document your findings and create a detailed report for the homeowner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="diagnosis-summary">
            Diagnosis Summary <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="diagnosis-summary"
            placeholder="Provide a clear summary of what you found and the root cause of the issue..."
            value={diagnosisSummary}
            onChange={(e) => setDiagnosisSummary(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This will be shown to the homeowner
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="technician-notes">
            Internal Notes (Optional)
          </Label>
          <Textarea
            id="technician-notes"
            placeholder="Add any internal notes or technical details for your records..."
            value={technicianNotes}
            onChange={(e) => setTechnicianNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            These notes are for your records only
          </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>Recommended Actions</Label>
          {recommendedActions.map((action, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Action ${index + 1}`}
                value={action}
                onChange={(e) => handleActionChange(index, e.target.value)}
              />
              {recommendedActions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAction(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddAction}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Action
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>Photos</Label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`Diagnostic ${index + 1}`}
                  className="rounded-lg border aspect-video object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemovePhoto(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <Label
              htmlFor="photo-upload"
              className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Camera className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Upload photos
              </span>
            </Label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleCompleteDiagnosis}
          disabled={isSubmitting || !diagnosisSummary.trim()}
          className="flex-1"
        >
          {isSubmitting ? "Saving..." : "Complete Diagnosis"}
        </Button>
        <Button
          onClick={handleGenerateQuote}
          disabled={isGeneratingQuote || !diagnosisSummary.trim()}
          className="flex-1"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isGeneratingQuote ? "Generating..." : "Generate Quote"}
        </Button>
      </CardFooter>
    </Card>
  );
}
