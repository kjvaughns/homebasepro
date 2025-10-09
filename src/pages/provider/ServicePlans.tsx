import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AddServicePlanDialog } from "@/components/provider/AddServicePlanDialog";
import { EditServicePlanDialog } from "@/components/provider/EditServicePlanDialog";

interface ServicePlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_frequency: string;
  service_type: string[] | null;
  is_active: boolean;
  is_recurring: boolean;
  includes_features: string[];
}

export default function ServicePlans() {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;

      const { data, error } = await supabase
        .from("service_plans")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const typedData = (data || []).map(plan => ({
        ...plan,
        includes_features: Array.isArray(plan.includes_features) ? plan.includes_features : []
      }));
      setPlans(typedData as ServicePlan[]);
    } catch (error) {
      console.error("Error loading plans:", error);
      toast({
        title: "Error",
        description: "Failed to load service plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Plans</h1>
          <p className="text-muted-foreground">
            Manage your service offerings and pricing
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No service plans yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first service plan to start offering services
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedPlan(plan);
                setShowEditDialog(true);
              }}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{plan.name}</CardTitle>
                  <Badge variant={plan.is_active ? "default" : "secondary"}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${(plan.price / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per {plan.billing_frequency}
                  </div>
                  {plan.service_type && Array.isArray(plan.service_type) && (
                    <div className="flex flex-wrap gap-1">
                      {plan.service_type.map((type) => (
                        <Badge key={type} variant="outline">{type}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddServicePlanDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadPlans}
      />

      <EditServicePlanDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={loadPlans}
        plan={selectedPlan}
      />
    </div>
  );
}
