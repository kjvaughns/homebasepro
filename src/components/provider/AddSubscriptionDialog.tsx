import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
}

interface ServicePlan {
  id: string;
  name: string;
  price: number;
  billing_frequency: string;
}

interface AddSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedClientId?: string;
}

export function AddSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedClientId,
}: AddSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [formData, setFormData] = useState({
    client_id: preSelectedClientId || "",
    plan_id: "",
    start_date: new Date().toISOString().split("T")[0],
    payment_method: "manual",
    auto_renew: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
      setStep(1);
      if (preSelectedClientId) {
        setFormData((prev) => ({ ...prev, client_id: preSelectedClientId }));
        setStep(2);
      }
    }
  }, [open, preSelectedClientId]);

  const loadData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .order("name");

      const { data: plansData } = await supabase
        .from("service_plans")
        .select("id, name, price, billing_frequency")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("name");

      setClients(clientsData || []);
      setPlans(plansData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const calculateNextBillingDate = () => {
    const startDate = new Date(formData.start_date);
    const selectedPlan = plans.find((p) => p.id === formData.plan_id);
    
    if (!selectedPlan) return null;

    switch (selectedPlan.billing_frequency) {
      case "weekly":
        startDate.setDate(startDate.getDate() + 7);
        break;
      case "monthly":
        startDate.setMonth(startDate.getMonth() + 1);
        break;
      case "quarterly":
        startDate.setMonth(startDate.getMonth() + 3);
        break;
      case "yearly":
        startDate.setFullYear(startDate.getFullYear() + 1);
        break;
    }
    return startDate.toISOString();
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const nextBillingDate = calculateNextBillingDate();

      const { error } = await supabase.from("client_subscriptions").insert({
        client_id: formData.client_id,
        plan_id: formData.plan_id,
        start_date: new Date(formData.start_date).toISOString(),
        next_billing_date: nextBillingDate,
        payment_method: formData.payment_method,
        auto_renew: formData.auto_renew,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription created successfully",
      });

      setFormData({
        client_id: "",
        plan_id: "",
        start_date: new Date().toISOString().split("T")[0],
        payment_method: "manual",
        auto_renew: true,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Error",
        description: "Failed to create subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === formData.plan_id);
  const selectedClient = clients.find((c) => c.id === formData.client_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Subscription</DialogTitle>
          <DialogDescription>
            Subscribe a client to a service plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 1 && (
            <div className="grid gap-2">
              <Label>Select Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, client_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active clients available
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-2">
              <Label>Select Service Plan *</Label>
              <Select
                value={formData.plan_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, plan_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ${(plan.price / 100).toFixed(2)}/
                      {plan.billing_frequency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {plans.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active plans available
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="card">Credit Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto_renew">Auto-renew subscription</Label>
                <Switch
                  id="auto_renew"
                  checked={formData.auto_renew}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_renew: checked })
                  }
                />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="font-semibold">Confirmation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium">{selectedClient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">
                    ${(selectedPlan?.price || 0) / 100}/
                    {selectedPlan?.billing_frequency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium">
                    {new Date(formData.start_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-renew:</span>
                  <span className="font-medium">
                    {formData.auto_renew ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                onOpenChange(false);
              }
            }}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          <Button
            onClick={() => {
              if (step < 4) {
                setStep(step + 1);
              } else {
                handleSubmit();
              }
            }}
            disabled={
              loading ||
              (step === 1 && !formData.client_id) ||
              (step === 2 && !formData.plan_id) ||
              clients.length === 0 ||
              plans.length === 0
            }
          >
            {loading ? "Creating..." : step === 4 ? "Create Subscription" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
