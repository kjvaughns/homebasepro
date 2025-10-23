import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";

interface ServiceWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const BUSINESS_TYPES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Landscaping",
  "Handyman",
  "Cleaning",
  "Pest Control",
  "Roofing",
  "Painting",
  "Carpentry",
];

export default function ServiceWizard({ open, onClose, onComplete }: ServiceWizardProps) {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState("");
  const [customType, setCustomType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      const typeToUse = businessType === "other" ? customType : businessType;

      // Call AI assistant to generate services
      const { data, error } = await supabase.functions.invoke('assistant-provider', {
        body: {
          message: `Generate 5-8 common services for a ${typeToUse} business`,
          context: {
            action: 'generate_services',
            business_type: typeToUse
          }
        }
      });

      if (error) throw error;

      // Parse and insert services
      const services = data.services || getDefaultServices(typeToUse);
      
      // Use raw SQL to insert since provider_services isn't in generated types yet
      for (const service of services) {
        await supabase.from('provider_services' as any).insert({
          organization_id: org.id,
          name: service.name,
          description: service.description,
          base_price: service.base_price || 0,
          unit: service.unit || 'per service',
          status: 'active'
        });
      }

      toast.success(`Added ${services.length} services!`);
      onComplete?.();
      onClose();
    } catch (error: any) {
      console.error('Error generating services:', error);
      toast.error(error.message || 'Failed to generate services');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultServices = (type: string) => {
    const defaults: Record<string, any[]> = {
      "Plumbing": [
        { name: "Drain Cleaning", description: "Clear clogged drains", base_price: 15000 },
        { name: "Leak Repair", description: "Fix water leaks", base_price: 12000 },
        { name: "Toilet Repair", description: "Fix toilet issues", base_price: 10000 },
        { name: "Water Heater Service", description: "Maintain water heater", base_price: 20000 },
      ],
      "HVAC": [
        { name: "AC Tune-Up", description: "Annual maintenance", base_price: 15000 },
        { name: "Filter Replacement", description: "Replace air filters", base_price: 8000 },
        { name: "System Inspection", description: "Full system check", base_price: 12000 },
      ],
    };
    
    return defaults[type] || [
      { name: "General Service", description: "Standard service", base_price: 10000 },
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Service Setup Wizard
          </DialogTitle>
          <DialogDescription>
            Let us help you set up your services based on your business type
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>What type of business do you run?</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {businessType === "other" && (
                <div className="space-y-2">
                  <Label>Specify your business type</Label>
                  <Input
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="e.g., Pool Maintenance"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!businessType || (businessType === "other" && !customType) || loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Services"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}