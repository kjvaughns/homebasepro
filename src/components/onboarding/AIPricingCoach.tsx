import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ServiceCategorySelector } from "./ServiceCategorySelector";
import { PricingContextForm } from "./PricingContextForm";
import { MarketDataDisplay } from "./MarketDataDisplay";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServiceCallPricing {
  trip_charge_cents: number;
  hourly_rate_cents: number;
  included_diagnostic_minutes: number;
}

interface FixedScopePricing {
  base_rate_type: 'per_sqft' | 'per_unit' | 'per_job';
  base_rate_cents: number;
  material_markup_pct: number;
}

interface MarketAnalysis {
  local_median_cents: number;
  your_vs_market_pct: number;
  assessment: string;
  confidence: string;
  reasoning: string;
}

export interface PricingStrategy {
  category: 'service_call' | 'fixed_scope' | '';
  service_call?: ServiceCallPricing;
  fixed_scope?: FixedScopePricing;
  overhead_per_job_cents: number;
  urgency_surcharge_pct: number;
  enable_urgency_surcharge: boolean;
  market_analysis?: MarketAnalysis;
}

interface AIPricingCoachProps {
  tradeType: string;
  serviceArea: string;
  value: PricingStrategy;
  onChange: (strategy: PricingStrategy) => void;
}

export function AIPricingCoach({ tradeType, serviceArea, value, onChange }: AIPricingCoachProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCategoryChange = (category: 'service_call' | 'fixed_scope') => {
    onChange({
      ...value,
      category,
      service_call: category === 'service_call' ? {
        trip_charge_cents: 0,
        hourly_rate_cents: 0,
        included_diagnostic_minutes: 30
      } : undefined,
      fixed_scope: category === 'fixed_scope' ? {
        base_rate_type: 'per_job',
        base_rate_cents: 0,
        material_markup_pct: 0
      } : undefined,
    });
  };

  const handleAnalyze = async () => {
    if (!value.category) {
      toast.error("Please select a pricing category first");
      return;
    }

    const yourRate = value.category === 'service_call' 
      ? value.service_call?.trip_charge_cents || 0
      : value.fixed_scope?.base_rate_cents || 0;

    if (yourRate === 0) {
      toast.error("Please enter your rates before analyzing");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-pricing-strategy', {
        body: {
          trade_type: tradeType,
          service_area: serviceArea,
          category: value.category,
          your_rate_cents: yourRate,
          strategy: value
        }
      });

      if (error) throw error;

      onChange({
        ...value,
        market_analysis: data.market_analysis
      });

      toast.success("Market analysis complete!");
    } catch (error: any) {
      console.error('Error analyzing pricing:', error);
      if (error.message?.includes('429')) {
        toast.error("Rate limit exceeded. Please try again in a moment.");
      } else if (error.message?.includes('402')) {
        toast.error("AI credits exhausted. Please add credits to continue.");
      } else {
        toast.error("Failed to analyze pricing. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <ServiceCategorySelector
        value={value.category}
        onChange={handleCategoryChange}
        tradeType={tradeType}
      />

      {value.category && (
        <>
          <PricingContextForm
            category={value.category}
            serviceCallData={value.service_call}
            fixedScopeData={value.fixed_scope}
            overheadPerJobCents={value.overhead_per_job_cents}
            urgencySurchargePct={value.urgency_surcharge_pct}
            enableUrgencySurcharge={value.enable_urgency_surcharge}
            onServiceCallChange={(data) => onChange({ ...value, service_call: data })}
            onFixedScopeChange={(data) => onChange({ ...value, fixed_scope: data })}
            onOverheadChange={(cents) => onChange({ ...value, overhead_per_job_cents: cents })}
            onUrgencySurchargeChange={(pct) => onChange({ ...value, urgency_surcharge_pct: pct })}
            onEnableUrgencySurchargeChange={(enabled) => onChange({ ...value, enable_urgency_surcharge: enabled })}
          />

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Market Data...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze My Pricing
              </>
            )}
          </Button>

          {value.market_analysis && (
            <MarketDataDisplay
              yourRate={value.category === 'service_call' 
                ? value.service_call?.trip_charge_cents || 0
                : value.fixed_scope?.base_rate_cents || 0}
              analysis={value.market_analysis}
            />
          )}
        </>
      )}
    </div>
  );
}
