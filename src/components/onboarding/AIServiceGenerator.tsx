import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Service {
  name: string;
  description: string;
  base_price_cents: number;
  duration_minutes: number;
}

interface AIServiceGeneratorProps {
  tradeType: string;
  defaultDescription?: string;
  onGenerate?: (services: Service[]) => void;
  onServicesGenerated?: (services: Service[]) => void;
}

export function AIServiceGenerator({ 
  tradeType, 
  defaultDescription = "",
  onGenerate,
  onServicesGenerated 
}: AIServiceGeneratorProps) {
  const [description, setDescription] = useState(defaultDescription);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please describe your services");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-provider-services', {
        body: { tradeType, description }
      });

      if (error) throw error;
      if (!data?.services) throw new Error('No services generated');

      const callback = onGenerate || onServicesGenerated;
      if (callback) callback(data.services);
      toast.success(`Generated ${data.services.length} services!`);
    } catch (error: any) {
      console.error('Error generating services:', error);
      toast.error(error.message || 'Failed to generate services');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium" style={{ color: 'hsl(var(--onboarding-text))' }}>
          Describe your services
        </label>
        <p className="text-xs mt-1" style={{ color: 'hsl(var(--onboarding-muted))' }}>
          AI will generate your service catalog with pricing
        </p>
      </div>
      
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g., I do drain cleaning, fixture repair, and emergency calls"
        className="min-h-[100px] resize-none"
        style={{
          background: 'hsla(var(--onboarding-card))',
          border: '1px solid hsla(var(--onboarding-border))',
          color: 'hsl(var(--onboarding-text))'
        }}
      />
      
      <Button 
        onClick={handleGenerate} 
        disabled={loading}
        className="w-full font-bold"
        style={{
          background: 'linear-gradient(90deg, hsl(var(--onboarding-green)), hsl(var(--accent)))',
          color: '#0b0d10',
          boxShadow: '0 8px 30px hsla(var(--onboarding-green-glow))'
        }}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate with AI
          </>
        )}
      </Button>
    </div>
  );
}