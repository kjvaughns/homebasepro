import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp } from "lucide-react";
import { ServiceCategorySelector } from "./ServiceCategorySelector";
import { PricingContextForm } from "./PricingContextForm";
import { MarketDataDisplay } from "./MarketDataDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServiceCallPricing {
  trip_charge?: number;
  hourly_labor_rate?: number;
  diagnostic_time_minutes?: number;
}

interface FixedScopePricing {
  rate_type?: 'per_sqft' | 'flat_rate' | 'tiered';
  base_rate?: number;
  material_markup_pct?: number;
}

interface MarketAnalysis {
  local_median_cents: number;
  your_vs_market_pct: number;
  assessment: string;
  confidence: string;
  reasoning: string;
}

export interface PricingStrategy {
  category: 'service_call' | 'fixed_scope';
  service_call_pricing?: ServiceCallPricing;
  fixed_scope_pricing?: FixedScopePricing;
  overhead_per_job?: number;
  enable_urgency_surcharge?: boolean;
  urgency_surcharge_pct?: number;
  market_analysis?: MarketAnalysis;
}

interface AIPricingCoachProps {
  tradeType: string;
  serviceArea: string;
  value: PricingStrategy;
  onChange: (value: PricingStrategy) => void;
}

export function AIPricingCoach({ tradeType, serviceArea, value, onChange }: AIPricingCoachProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCategoryChange = (category: 'service_call' | 'fixed_scope') => {
    onChange({ ...value, category, market_analysis: undefined });
  };

  const handleAnalyze = async () => {
    const yourRate = value.category === 'service_call' 
      ? value.service_call_pricing?.hourly_labor_rate 
      : value.fixed_scope_pricing?.base_rate;

    if (!yourRate) {
      toast.error("Please enter your rates first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-pricing-strategy', {
        body: {
          trade_type: tradeType,
          service_area: serviceArea,
          category: value.category,
          your_rate: yourRate,
          pricing_strategy: value
        }
      });

      if (error) throw error;
      if (data?.market_analysis) {
        onChange({ ...value, market_analysis: data.market_analysis });
        toast.success("Pricing analysis complete!");
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze pricing');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <ServiceCategorySelector
        tradeType={tradeType}
        value={value.category}
        onChange={handleCategoryChange}
      />

      <div className="p-6 rounded-xl" style={{
        background: 'hsla(var(--onboarding-card))',
        border: '1px solid hsla(var(--onboarding-border))'
      }}>
        <PricingContextForm 
          category={value.category}
          serviceCallData={value.service_call_pricing}
          fixedScopeData={value.fixed_scope_pricing}
          overheadPerJob={value.overhead_per_job}
          enableUrgencySurcharge={value.enable_urgency_surcharge}
          urgencySurcharge={value.urgency_surcharge_pct}
          tradeType={tradeType}
          serviceArea={serviceArea}
          onServiceCallChange={(data) => onChange({ ...value, service_call_pricing: { ...value.service_call_pricing, ...data } })}
          onFixedScopeChange={(data) => onChange({ ...value, fixed_scope_pricing: { ...value.fixed_scope_pricing, ...data } })}
          onOverheadChange={(overhead) => onChange({ ...value, overhead_per_job: overhead })}
          onUrgencySurchargeToggle={(enabled) => onChange({ ...value, enable_urgency_surcharge: enabled })}
          onUrgencySurchargeChange={(pct) => onChange({ ...value, urgency_surcharge_pct: pct })}
        />

        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full mt-6" style={{
          background: 'linear-gradient(90deg, hsl(var(--onboarding-green)), hsl(var(--accent)))',
          color: '#0b0d10'
        }}>
          {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><TrendingUp className="w-4 h-4 mr-2" />Analyze Pricing</>}
        </Button>
      </div>

      {value.market_analysis && <MarketDataDisplay yourRate={value.category === 'service_call' ? value.service_call_pricing?.hourly_labor_rate || 0 : value.fixed_scope_pricing?.base_rate || 0} analysis={value.market_analysis} />}
    </div>
  );
}
