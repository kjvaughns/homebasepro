import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronRight, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

interface SetupChecklistProps {
  onOpenWizard?: () => void;
}

export function SetupChecklist({ onOpenWizard }: SetupChecklistProps) {
  const navigate = useNavigate();
  const [checks, setChecks] = useState({
    stripeConnected: false,
    hasClients: false,
    hasJobs: false,
    hasInvoices: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check Stripe
      const { data: org } = await supabase
        .from("organizations")
        .select("id, stripe_account_id")
        .eq("owner_id", user.id)
        .single();

      // Check clients
      const { count: clientCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org?.id);

      // Check jobs
      const { count: jobCount } = await supabase
        .from("jobs" as any)
        .select("*", { count: "exact", head: true })
        .eq("provider_org_id", org?.id);

      // Check invoices
      const { count: invoiceCount } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("org_id", org?.id);

      setChecks({
        stripeConnected: !!org?.stripe_account_id,
        hasClients: (clientCount || 0) > 0,
        hasJobs: (jobCount || 0) > 0,
        hasInvoices: (invoiceCount || 0) > 0,
      });
    } catch (error) {
      console.error("Error checking setup status:", error);
    } finally {
      setLoading(false);
    }
  };

  const items = [
    { key: "stripeConnected", label: "Connect Stripe", action: () => navigate("/provider/settings?tab=payments") },
    { key: "hasClients", label: "Add your first client", action: () => navigate("/provider/clients") },
    { key: "hasJobs", label: "Create your first job", action: () => navigate("/provider/jobs") },
    { key: "hasInvoices", label: "Send your first invoice", action: () => navigate("/provider/payments") },
  ];

  const completedCount = Object.values(checks).filter(Boolean).length;
  const allComplete = completedCount === items.length;

  // Trigger confetti when all items are complete
  useEffect(() => {
    if (allComplete && !loading) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [allComplete, loading]);

  if (loading) return null;

  if (allComplete) {
    return (
      <Card className="border-primary/50 bg-primary/5 animate-scale-in">
        <CardContent className="text-center py-8">
          <Trophy className="h-12 w-12 mx-auto mb-3 text-primary" />
          <h3 className="text-lg font-semibold mb-2">🎉 Setup Complete!</h3>
          <p className="text-sm text-muted-foreground">You're all set to start growing your business</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>🚀 Complete Your Setup</span>
          <span className="text-sm font-normal text-muted-foreground">{completedCount}/{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const isComplete = checks[item.key as keyof typeof checks];
          return (
            <Button
              key={item.key}
              variant="ghost"
              className="w-full justify-start h-auto py-2 px-3"
              onClick={item.action}
            >
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
              )}
              <span className={`flex-1 text-left text-sm ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          );
        })}
        
        {onOpenWizard && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={onOpenWizard}>
            Reopen Setup Wizard
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
