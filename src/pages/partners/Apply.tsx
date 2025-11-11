import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function PartnersApply() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    type: (searchParams.get("type") as "PRO" | "CREATOR") || "PRO",
    business_name: "",
    website: "",
    audience_size: "",
    application_notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("partner-apply", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you within 2-3 business days.",
      });

      navigate("/partners?applied=true");
    } catch (error: any) {
      console.error("Application error:", error);
      toast({
        title: "Application failed",
        description: error.message || "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/partners")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Partners
        </Button>

        <Card className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Partner Application</h1>
            <p className="text-muted-foreground">
              Fill out the form below to apply. We'll review your application within 2-3 business days.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Partner Type */}
            <div className="space-y-3">
              <Label>Partner Track</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as "PRO" | "CREATOR" })}
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4">
                  <RadioGroupItem value="PRO" id="pro" />
                  <Label htmlFor="pro" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Pro Partner (25% commission)</div>
                    <div className="text-sm text-muted-foreground">
                      For agencies, consultants, and pros with clients
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4">
                  <RadioGroupItem value="CREATOR" id="creator" />
                  <Label htmlFor="creator" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Creator Partner (15-20% commission)</div>
                    <div className="text-sm text-muted-foreground">
                      For creators, influencers, and thought leaders
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Personal Info */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_name">Business/Brand Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Your company or personal brand"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website/Social Profile</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience_size">Audience Size</Label>
              <Input
                id="audience_size"
                value={formData.audience_size}
                onChange={(e) => setFormData({ ...formData, audience_size: e.target.value })}
                placeholder="e.g., 5,000 followers, 50 clients"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_notes">Tell us about yourself</Label>
              <Textarea
                id="application_notes"
                value={formData.application_notes}
                onChange={(e) => setFormData({ ...formData, application_notes: e.target.value })}
                placeholder="Why do you want to become a partner? How do you plan to promote HomeBase?"
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
