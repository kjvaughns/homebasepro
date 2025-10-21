import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, FileText, CheckCircle, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

interface JobChecklistProps {
  jobId: string;
  onComplete?: () => void;
}

export function JobChecklist({ jobId, onComplete }: JobChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "arrive", label: "Arrive at location & clock in", completed: false },
    { id: "pre-check", label: "Complete pre-service inspection", completed: false },
    { id: "before-photos", label: "Take before photos", completed: false },
    { id: "service", label: "Perform service work", completed: false },
    { id: "after-photos", label: "Take after photos", completed: false },
    { id: "parts", label: "Log parts used", completed: false },
    { id: "signature", label: "Get customer signature", completed: false },
    { id: "upsell", label: "Review upsell opportunities", completed: false },
    { id: "payment", label: "Collect payment (if applicable)", completed: false },
    { id: "notes", label: "Add wrap-up notes", completed: false },
  ]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [partsUsed, setPartsUsed] = useState("");
  const [wrapupNotes, setWrapupNotes] = useState("");
  const { toast } = useToast();

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleComplete = () => {
    const incomplete = checklist.filter((item) => !item.completed);
    if (incomplete.length > 0) {
      toast({
        title: "Incomplete Checklist",
        description: `Please complete: ${incomplete.map((i) => i.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Job Complete",
      description: "All checklist items completed",
    });
    onComplete?.();
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Job Workflow</span>
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/{checklist.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50"
              >
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={() => toggleItem(item.id)}
                />
                <Label
                  htmlFor={item.id}
                  className={`flex-1 cursor-pointer ${
                    item.completed ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoUpload}
          />
          {photos.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {photos.length} photo(s) selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Parts Used */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Parts Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="List parts and materials used..."
            value={partsUsed}
            onChange={(e) => setPartsUsed(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Wrap-up Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Wrap-up Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any final notes or observations..."
            value={wrapupNotes}
            onChange={(e) => setWrapupNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Complete Button */}
      <Button
        onClick={handleComplete}
        className="w-full"
        size="lg"
        disabled={progress < 100}
      >
        <CheckCircle className="mr-2 h-5 w-5" />
        Complete Job
      </Button>
    </div>
  );
}