import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, X, Sparkles, FileText, Calendar } from "lucide-react";
import { addDays } from "date-fns";

interface QuoteBuilderProps {
  serviceCallId?: string;
  serviceRequestId?: string;
  homeownerId: string;
  homeId: string;
  onSuccess?: (quoteId: string) => void;
}

interface LineItem {
  name: string;
  description: string;
  amount: number;
}

export function QuoteBuilder({
  serviceCallId,
  serviceRequestId,
  homeownerId,
  homeId,
  onSuccess
}: QuoteBuilderProps) {
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState<string>("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [quoteType, setQuoteType] = useState<string>("full_service");
  const [laborCost, setLaborCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [validDays, setValidDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    loadProviderOrg();
    if (serviceCallId) {
      loadServiceCallData();
    }
  }, [serviceCallId]);

  const loadProviderOrg = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (org) setOrgId(org.id);
    } catch (error) {
      console.error("Error loading org:", error);
    }
  };

  const loadServiceCallData = async () => {
    if (!serviceCallId) return;

    try {
      const { data, error } = await supabase
        .from("service_calls")
        .select("diagnosis_summary, recommended_actions")
        .eq("id", serviceCallId)
        .single();

      if (error) throw error;

      if (data.diagnosis_summary) {
        setDescription(data.diagnosis_summary);
      }
    } catch (error) {
      console.error("Error loading service call:", error);
    }
  };

  const getAISuggestion = async () => {
    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quote", {
        body: {
          service_name: serviceName,
          description: description,
          service_call_id: serviceCallId
        }
      });

      if (error) throw error;

      setAiSuggestion(data);
      
      if (data.suggested_labor_cost) {
        setLaborCost((data.suggested_labor_cost / 100).toFixed(2));
      }
      if (data.suggested_parts_cost) {
        setPartsCost((data.suggested_parts_cost / 100).toFixed(2));
      }
      if (data.line_items && data.line_items.length > 0) {
        setLineItems(data.line_items.map((item: any) => ({
          ...item,
          amount: item.amount / 100
        })));
      }

      toast.success("AI pricing suggestions loaded!");
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast.error("Failed to get AI suggestions");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { name: "", description: "", amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const calculateTotal = () => {
    const labor = parseFloat(laborCost) || 0;
    const parts = parseFloat(partsCost) || 0;
    const items = lineItems.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);
    return labor + parts + items;
  };

  const handleSubmit = async () => {
    if (!serviceName.trim()) {
      toast.error("Please enter a service name");
      return;
    }

    if (calculateTotal() === 0) {
      toast.error("Total amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = Math.round(calculateTotal() * 100); // Convert to cents
      const validUntil = addDays(new Date(), parseInt(validDays));

      const { data, error } = await supabase
        .from("quotes")
        .insert({
          service_request_id: serviceRequestId || null,
          provider_org_id: orgId,
          homeowner_id: homeownerId,
          home_id: homeId,
          quote_type: quoteType,
          service_name: serviceName,
          description: description || null,
          labor_cost: laborCost ? Math.round(parseFloat(laborCost) * 100) : null,
          parts_cost: partsCost ? Math.round(parseFloat(partsCost) * 100) : null,
          total_amount: totalAmount,
          line_items: lineItems.map(item => ({
            ...item,
            amount: Math.round(parseFloat(String(item.amount)) * 100)
          })),
          valid_until: validUntil.toISOString(),
          status: 'pending',
          ai_generated: aiSuggestion !== null,
          ai_confidence: aiSuggestion?.confidence || null,
          pricing_factors: aiSuggestion?.pricing_factors || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Update service call if applicable
      if (serviceCallId) {
        await supabase
          .from("service_calls")
          .update({ generated_quote_id: data.id })
          .eq("id", serviceCallId);
      }

      // Create workflow and send notifications
      try {
        await supabase.functions.invoke('workflow-orchestrator', {
          body: {
            action: 'quote_created',
            quoteId: data.id,
            homeownerId: homeownerId,
            providerOrgId: orgId,
            metadata: {
              service_name: serviceName,
              total_amount: totalAmount
            }
          }
        });
      } catch (workflowError) {
        console.error('Workflow creation failed:', workflowError);
        // Don't block quote creation if workflow fails
      }

      toast.success("Quote created and sent to homeowner!");
      
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        navigate(`/provider/quotes/${data.id}`);
      }
    } catch (error) {
      console.error("Error creating quote:", error);
      toast.error("Failed to create quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create Quote
        </CardTitle>
        <CardDescription>
          Build a detailed quote for your customer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="service-name">
            Service Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="service-name"
            placeholder="e.g., HVAC System Repair"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quote-type">Quote Type</Label>
          <Select value={quoteType} onValueChange={setQuoteType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diagnostic">Diagnostic</SelectItem>
              <SelectItem value="full_service">Full Service</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the work to be performed..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={getAISuggestion}
            disabled={isLoadingAI || !serviceName}
            className="w-full mt-2"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isLoadingAI ? "Generating..." : "Get AI Pricing Suggestions"}
          </Button>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="labor-cost">Labor Cost ($)</Label>
            <Input
              id="labor-cost"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parts-cost">Parts & Materials ($)</Label>
            <Input
              id="parts-cost"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={partsCost}
              onChange={(e) => setPartsCost(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Additional Line Items</Label>
            <Button variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {lineItems.map((item, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount ($)"
                      value={item.amount || ""}
                      onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="valid-days">Valid For (Days)</Label>
          <Select value={validDays} onValueChange={setValidDays}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        {aiSuggestion && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 inline mr-1" />
              AI Confidence: {(aiSuggestion.confidence * 100).toFixed(0)}% | 
              Based on {aiSuggestion.similar_jobs || 0} similar jobs
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !serviceName || calculateTotal() === 0}
          className="flex-1"
        >
          {isSubmitting ? "Creating..." : "Create & Send Quote"}
        </Button>
      </CardFooter>
    </Card>
  );
}
