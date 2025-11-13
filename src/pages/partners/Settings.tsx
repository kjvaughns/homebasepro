import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogOut } from "lucide-react";
import ChangePassword from "@/components/partners/ChangePassword";

export default function PartnersSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    loadPartner();
  }, []);

  const loadPartner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/partners/login");
        return;
      }

      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        navigate("/partners");
        return;
      }

      setPartner(data);
    } catch (error) {
      console.error("Error loading partner:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully",
    });
    navigate("/partners");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/partners/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Partner Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your partner account
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <Label>Partner Type</Label>
              <Input value={partner.type} readOnly className="mt-2" />
            </div>
            <div>
              <Label>Referral Code</Label>
              <Input value={partner.referral_code} readOnly className="mt-2 font-mono font-bold" />
            </div>
            <div>
              <Label>Referral Slug</Label>
              <Input value={partner.referral_slug} readOnly className="mt-2 font-mono" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Commission Rate</Label>
                <Input value={`${partner.commission_rate_bp / 100}%`} readOnly className="mt-2" />
              </div>
              <div>
                <Label>Discount Rate</Label>
                <Input value={`${partner.discount_rate_bp / 100}%`} readOnly className="mt-2" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Business Details</h2>
          <div className="space-y-4">
            <div>
              <Label>Business Name</Label>
              <Input value={partner.business_name || "-"} readOnly className="mt-2" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={partner.website || "-"} readOnly className="mt-2" />
            </div>
            <div>
              <Label>Audience Size</Label>
              <Input value={partner.audience_size || "-"} readOnly className="mt-2" />
            </div>
          </div>
        </Card>

        <ChangePassword />

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Stripe Connect</h2>
          <div className="space-y-4">
            <div>
              <Label>Account Status</Label>
              <Input 
                value={partner.stripe_account_id ? "Connected" : "Not Connected"} 
                readOnly 
                className="mt-2" 
              />
            </div>
            {partner.stripe_account_id && (
              <div>
                <Label>Account ID</Label>
                <Input 
                  value={partner.stripe_account_id} 
                  readOnly 
                  className="mt-2 font-mono text-sm" 
                />
              </div>
            )}
            <Button variant="outline">
              Update Payout Details
            </Button>
          </div>
        </Card>

        <Card className="p-6 border-destructive/50">
          <h2 className="text-xl font-bold mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your partner account
              </p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
