import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, DollarSign, Clock, X } from "lucide-react";

interface ServiceGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  trade?: string;
}

interface GeneratedService {
  name: string;
  description: string;
  duration_minutes: number;
  suggested_price_cents: number;
  category: string;
}

export function ServiceGeneratorModal({ open, onClose, onSuccess, trade = "" }: ServiceGeneratorModalProps) {
  const [step, setStep] = useState<'input' | 'generated'>('input');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<GeneratedService[]>([]);
  const [editingServices, setEditingServices] = useState<Map<number, GeneratedService>>(new Map());

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please describe what services you offer");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-services-ai', {
        body: { text: description, trade }
      });

      if (error) throw error;

      setServices(data.services || []);
      setStep('generated');
    } catch (error: any) {
      console.error("Error generating services:", error);
      toast.error(error.message || "Failed to generate services");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index: number, field: keyof GeneratedService, value: any) => {
    const updated = new Map(editingServices);
    const service = updated.get(index) || services[index];
    updated.set(index, { ...service, [field]: value });
    setEditingServices(updated);
  };

  const getService = (index: number) => editingServices.get(index) || services[index];

  const handleRemove = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
    const updated = new Map(editingServices);
    updated.delete(index);
    setEditingServices(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) throw new Error("Organization not found");

      const servicesToInsert = services.map((service, index) => {
        const editedService = getService(index);
        return {
          organization_id: org.id,
          name: editedService.name,
          description: editedService.description,
          category: editedService.category,
          pricing_type: 'flat',
          default_price: editedService.suggested_price_cents,
          estimated_duration_minutes: editedService.duration_minutes,
          is_active: true
        };
      });

      const { error } = await supabase
        .from('services')
        .insert(servicesToInsert);

      if (error) throw error;

      toast.success(`${services.length} service${services.length > 1 ? 's' : ''} added successfully`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error saving services:", error);
      toast.error(error.message || "Failed to save services");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Services with AI
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Describe what services you offer</Label>
              <Textarea
                placeholder="e.g., I offer lawn mowing, hedge trimming, mulching, and seasonal cleanup services for residential properties..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Services
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'generated' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Review and edit the generated services. You can adjust prices, durations, and descriptions.
            </p>

            <div className="space-y-3">
              {services.map((service, index) => {
                const currentService = getService(index);
                return (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          value={currentService.name}
                          onChange={(e) => handleEdit(index, 'name', e.target.value)}
                          className="font-semibold"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(index)}
                          className="text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={currentService.description}
                        onChange={(e) => handleEdit(index, 'description', e.target.value)}
                        rows={2}
                        className="text-sm"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Price</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={(currentService.suggested_price_cents / 100).toFixed(2)}
                              onChange={(e) => handleEdit(index, 'suggested_price_cents', Math.round(parseFloat(e.target.value) * 100))}
                              className="pl-8"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Duration (minutes)</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={currentService.duration_minutes}
                              onChange={(e) => handleEdit(index, 'duration_minutes', parseInt(e.target.value))}
                              className="pl-8"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || services.length === 0}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    `Save ${services.length} Service${services.length > 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}