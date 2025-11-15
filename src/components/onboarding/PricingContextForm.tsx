import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
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

interface PricingContextFormProps {
  category: 'service_call' | 'fixed_scope';
  serviceCallData?: ServiceCallPricing;
  fixedScopeData?: FixedScopePricing;
  overheadPerJob?: number;
  enableUrgencySurcharge?: boolean;
  urgencySurcharge?: number;
  tradeType?: string;
  serviceArea?: string;
  onServiceCallChange?: (data: Partial<ServiceCallPricing>) => void;
  onFixedScopeChange?: (data: Partial<FixedScopePricing>) => void;
  onOverheadChange?: (value: number) => void;
  onUrgencySurchargeToggle?: (enabled: boolean) => void;
  onUrgencySurchargeChange?: (value: number) => void;
}

export function PricingContextForm({
  category,
  serviceCallData,
  fixedScopeData,
  overheadPerJob = 0,
  enableUrgencySurcharge = false,
  urgencySurcharge = 0,
  tradeType = '',
  serviceArea = '',
  onServiceCallChange,
  onFixedScopeChange,
  onOverheadChange,
  onUrgencySurchargeToggle,
  onUrgencySurchargeChange
}: PricingContextFormProps) {
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleGetSuggestions = async () => {
    if (!tradeType || !serviceArea) {
      toast.error("Please complete business info first");
      return;
    }

    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-typical-rates', {
        body: { tradeType, serviceArea, category }
      });

      if (error) throw error;

      if (data) {
        toast.success("Applied typical rates for your market!");
        
        if (category === 'service_call' && data.trip_charge && data.hourly_rate) {
          onServiceCallChange?.({
            trip_charge: data.trip_charge.typical || serviceCallData?.trip_charge,
            hourly_labor_rate: data.hourly_rate.typical || serviceCallData?.hourly_labor_rate,
          });
        }
        
        if (category === 'fixed_scope' && data.material_markup) {
          onFixedScopeChange?.({
            material_markup_pct: data.material_markup.typical || fixedScopeData?.material_markup_pct,
          });
        }
        
        if (data.overhead) {
          onOverheadChange?.(data.overhead.typical || overheadPerJob);
        }
      }
    } catch (error: any) {
      console.error('Error getting rate suggestions:', error);
      toast.error(error.message || 'Failed to get rate suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '';
    return value.toString();
  };

  const parseCurrency = (value: string) => {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetSuggestions}
          disabled={loadingSuggestions || !tradeType || !serviceArea}
          className="gap-2"
        >
          {loadingSuggestions ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Getting suggestions...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI Suggest Rates
            </>
          )}
        </Button>
      </div>

      {category === 'service_call' && (
        <div className="space-y-4">
          <div>
            <Label>Trip Charge ($)</Label>
            <Input
              type="number"
              placeholder="75"
              value={formatCurrency(serviceCallData?.trip_charge)}
              onChange={(e) => onServiceCallChange?.({ 
                ...serviceCallData,
                trip_charge: parseCurrency(e.target.value) 
              })}
              className="text-lg"
            />
          </div>

          <div>
            <Label>Hourly Labor Rate ($)</Label>
            <Input
              type="number"
              placeholder="100"
              value={formatCurrency(serviceCallData?.hourly_labor_rate)}
              onChange={(e) => onServiceCallChange?.({ 
                ...serviceCallData,
                hourly_labor_rate: parseCurrency(e.target.value) 
              })}
              className="text-lg"
            />
          </div>
        </div>
      )}

      {category === 'fixed_scope' && (
        <div className="space-y-4">
          <div>
            <Label>Rate Type</Label>
            <Select
              value={fixedScopeData?.rate_type || 'flat_rate'}
              onValueChange={(value: 'per_sqft' | 'flat_rate' | 'tiered') => 
                onFixedScopeChange?.({ ...fixedScopeData, rate_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat_rate">Flat Rate</SelectItem>
                <SelectItem value="per_sqft">Per Sq Ft</SelectItem>
                <SelectItem value="tiered">Tiered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Base Rate ($)</Label>
            <Input
              type="number"
              placeholder="250"
              value={formatCurrency(fixedScopeData?.base_rate)}
              onChange={(e) => onFixedScopeChange?.({ 
                ...fixedScopeData,
                base_rate: parseCurrency(e.target.value) 
              })}
              className="text-lg"
            />
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t">
        <div>
          <Label>Overhead Per Job ($)</Label>
          <Input
            type="number"
            placeholder="50"
            value={formatCurrency(overheadPerJob)}
            onChange={(e) => onOverheadChange?.(parseCurrency(e.target.value))}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Enable Urgency Surcharge</Label>
          <Switch
            checked={enableUrgencySurcharge}
            onCheckedChange={onUrgencySurchargeToggle}
          />
        </div>

        {enableUrgencySurcharge && (
          <div>
            <Label>Urgency Surcharge (%)</Label>
            <Input
              type="number"
              placeholder="50"
              value={urgencySurcharge || ''}
              onChange={(e) => onUrgencySurchargeChange?.(parseInt(e.target.value) || 0)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
