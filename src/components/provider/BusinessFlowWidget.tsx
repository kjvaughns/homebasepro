import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, UserPlus, Briefcase, FileText, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function BusinessFlowWidget() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    clients: 0,
    jobs: 0,
    invoices: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org) return;

    const { count: clientCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id);

    const { count: jobCount } = await supabase
      .from("jobs" as any)
      .select("*", { count: "exact", head: true })
      .eq("provider_org_id", org.id);

    const { count: invoiceCount } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org.id);

    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("org_id", org.id)
      .eq("status", "completed");

    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    setStats({
      clients: clientCount || 0,
      jobs: jobCount || 0,
      invoices: invoiceCount || 0,
      revenue: totalRevenue,
    });
  };

  const steps = [
    {
      icon: UserPlus,
      label: "Add Client",
      count: stats.clients,
      action: () => navigate("/provider/clients"),
    },
    {
      icon: Briefcase,
      label: "Create Job",
      count: stats.jobs,
      action: () => navigate("/provider/jobs"),
    },
    {
      icon: FileText,
      label: "Send Invoice",
      count: stats.invoices,
      action: () => navigate("/provider/payments"),
    },
    {
      icon: DollarSign,
      label: "Get Paid",
      count: `$${stats.revenue.toLocaleString()}`,
      action: () => navigate("/provider/balance"),
    },
  ];

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your Business Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <Button
                variant="outline"
                size="sm"
                className="h-auto flex-col gap-0.5 sm:gap-1 p-1.5 sm:p-2 w-full"
                onClick={step.action}
              >
                <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[10px] sm:text-xs text-center leading-tight">{step.label}</span>
                <span className="text-[10px] sm:text-xs font-semibold text-primary">{step.count}</span>
              </Button>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground mt-4 hidden md:block" />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Click any step to get started
        </p>
      </CardContent>
    </Card>
  );
}
