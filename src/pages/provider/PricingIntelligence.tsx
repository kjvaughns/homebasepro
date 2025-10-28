import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProviderLayout from "@/layouts/ProviderLayout";
import { TrendingUp, TrendingDown, Target, Sparkles, DollarSign } from "lucide-react";

export default function PricingIntelligence() {
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [metrics, setMetrics] = useState({
    avgQuoteAmount: 0,
    quoteAcceptanceRate: 0,
    avgJobAmount: 0,
    pricingAccuracy: 0,
    marketComparison: 0
  });
  const [serviceBreakdown, setServiceBreakdown] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) throw new Error("Organization not found");
      setOrgId(org.id);

      // Get quotes data
      const { data: quotes } = await supabase
        .from("quotes")
        .select("*")
        .eq("provider_org_id", org.id);

      // Get learning events for this provider
      const { data: learningEvents } = await supabase
        .from("ai_learning_events")
        .select("*")
        .eq("provider_org_id", org.id);

      // Calculate metrics
      if (quotes && quotes.length > 0) {
        const avgQuote = quotes.reduce((sum, q) => sum + q.total_amount, 0) / quotes.length;
        const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
        const totalDecided = quotes.filter(q => ['accepted', 'rejected'].includes(q.status)).length;
        const acceptanceRate = totalDecided > 0 ? (acceptedQuotes / totalDecided) * 100 : 0;

        const jobOutcomes = learningEvents?.filter(e => e.event_type === 'job_outcome') || [];
        const avgAccuracy = jobOutcomes.length > 0
          ? jobOutcomes.reduce((sum, e) => sum + (e.accuracy_score || 0), 0) / jobOutcomes.length
          : 0;

        const avgActual = jobOutcomes.length > 0
          ? jobOutcomes.reduce((sum, e) => {
              const finalPrice = e.actual_outcome && typeof e.actual_outcome === 'object' 
                ? (e.actual_outcome as any).final_price 
                : 0;
              return sum + (finalPrice || 0);
            }, 0) / jobOutcomes.length
          : 0;

        setMetrics({
          avgQuoteAmount: avgQuote / 100,
          quoteAcceptanceRate: acceptanceRate,
          avgJobAmount: avgActual / 100,
          pricingAccuracy: avgAccuracy * 100,
          marketComparison: 0 // TODO: Compare with market averages
        });

        // Service breakdown
        const serviceMap = new Map<string, { count: number; avgAmount: number; acceptanceRate: number }>();
        
        quotes.forEach(q => {
          const existing = serviceMap.get(q.service_name) || { count: 0, avgAmount: 0, acceptanceRate: 0 };
          existing.count++;
          existing.avgAmount = (existing.avgAmount * (existing.count - 1) + q.total_amount) / existing.count;
          serviceMap.set(q.service_name, existing);
        });

        const breakdown = Array.from(serviceMap.entries()).map(([name, data]) => ({
          service: name,
          ...data,
          avgAmount: data.avgAmount / 100
        })).sort((a, b) => b.count - a.count).slice(0, 10);

        setServiceBreakdown(breakdown);
      }
    } catch (error) {
      console.error("Error loading pricing intelligence:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>Loading pricing intelligence...</div>
      </div>
    );
  }

  return (
    <ProviderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Pricing Intelligence
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered insights to optimize your pricing strategy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Avg Quote</p>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold">${metrics.avgQuoteAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Across all services
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-primary">
                {metrics.quoteAcceptanceRate.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 mt-1">
                {metrics.quoteAcceptanceRate >= 65 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">Above average</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-orange-500" />
                    <span className="text-xs text-orange-500">Room for improvement</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Pricing Accuracy</p>
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold">{metrics.pricingAccuracy.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Quotes vs actual costs
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown</CardTitle>
            <CardDescription>
              Performance by service type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {serviceBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No data yet. Create some quotes to see insights!
                </p>
              ) : (
                serviceBreakdown.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{service.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.count} quotes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        ${service.avgAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">avg</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.quoteAcceptanceRate < 50 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                <Badge variant="outline">Pricing</Badge>
                <p className="text-sm">
                  Your acceptance rate is below 50%. Consider lowering prices by 10-15% 
                  or improving your quote descriptions to better justify your pricing.
                </p>
              </div>
            )}
            
            {metrics.pricingAccuracy < 80 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                <Badge variant="outline">Accuracy</Badge>
                <p className="text-sm">
                  Your final costs often differ from quotes. Use the AI pricing suggestions 
                  more closely, or track parts costs better to improve accuracy.
                </p>
              </div>
            )}

            {metrics.quoteAcceptanceRate >= 75 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                <Badge variant="default">Great Job!</Badge>
                <p className="text-sm">
                  Your 75%+ acceptance rate is excellent! Consider slightly raising prices 
                  by 5-10% on your most popular services to maximize revenue.
                </p>
              </div>
            )}

            {serviceBreakdown.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Start creating quotes to unlock AI-powered pricing recommendations!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}
