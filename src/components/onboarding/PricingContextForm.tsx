import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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

interface PricingContextFormProps {
  category: 'service_call' | 'fixed_scope';
  serviceCallData?: ServiceCallPricing;
  fixedScopeData?: FixedScopePricing;
  overheadPerJobCents: number;
  urgencySurchargePct: number;
  enableUrgencySurcharge: boolean;
  onServiceCallChange: (data: ServiceCallPricing) => void;
  onFixedScopeChange: (data: FixedScopePricing) => void;
  onOverheadChange: (cents: number) => void;
  onUrgencySurchargeChange: (pct: number) => void;
  onEnableUrgencySurchargeChange: (enabled: boolean) => void;
}

export function PricingContextForm({
  category,
  serviceCallData,
  fixedScopeData,
  overheadPerJobCents,
  urgencySurchargePct,
  enableUrgencySurcharge,
  onServiceCallChange,
  onFixedScopeChange,
  onOverheadChange,
  onUrgencySurchargeChange,
  onEnableUrgencySurchargeChange,
}: PricingContextFormProps) {
  const formatCurrency = (cents: number) => (cents / 100).toFixed(2);
  const parseCurrency = (value: string) => Math.round(parseFloat(value || '0') * 100);

  return (
    <div className="space-y-6">
      {category === 'service_call' ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="trip_charge" className="text-foreground">Trip Charge / Service Call Fee</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="trip_charge"
                type="number"
                step="0.01"
                min="0"
                value={formatCurrency(serviceCallData?.trip_charge_cents || 0)}
                onChange={(e) => onServiceCallChange({
                  ...serviceCallData!,
                  trip_charge_cents: parseCurrency(e.target.value)
                })}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Flat fee charged for arriving at the property
            </p>
          </div>

          <div>
            <Label htmlFor="hourly_rate" className="text-foreground">Hourly Labor Rate</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formatCurrency(serviceCallData?.hourly_rate_cents || 0)}
                onChange={(e) => onServiceCallChange({
                  ...serviceCallData!,
                  hourly_rate_cents: parseCurrency(e.target.value)
                })}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per hour rate for labor
            </p>
          </div>

          <div>
            <Label htmlFor="diagnostic_time" className="text-foreground">Included Diagnostic Time (minutes)</Label>
            <Input
              id="diagnostic_time"
              type="number"
              min="0"
              value={serviceCallData?.included_diagnostic_minutes || 0}
              onChange={(e) => onServiceCallChange({
                ...serviceCallData!,
                included_diagnostic_minutes: parseInt(e.target.value || '0')
              })}
              className="mt-2"
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minutes included in trip charge before hourly billing starts
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="rate_type" className="text-foreground">Rate Type</Label>
            <Select
              value={fixedScopeData?.base_rate_type || 'per_job'}
              onValueChange={(v) => onFixedScopeChange({
                ...fixedScopeData!,
                base_rate_type: v as 'per_sqft' | 'per_unit' | 'per_job'
              })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select rate type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_sqft">Per Square Foot</SelectItem>
                <SelectItem value="per_unit">Per Unit (windows, rooms, etc.)</SelectItem>
                <SelectItem value="per_job">Flat Rate Per Job</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="base_rate" className="text-foreground">
              Base Rate {fixedScopeData?.base_rate_type === 'per_sqft' ? '(per sqft)' : 
                        fixedScopeData?.base_rate_type === 'per_unit' ? '(per unit)' : '(per job)'}
            </Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="base_rate"
                type="number"
                step="0.01"
                min="0"
                value={formatCurrency(fixedScopeData?.base_rate_cents || 0)}
                onChange={(e) => onFixedScopeChange({
                  ...fixedScopeData!,
                  base_rate_cents: parseCurrency(e.target.value)
                })}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="material_markup" className="text-foreground">Material Markup %</Label>
            <div className="relative mt-2">
              <Input
                id="material_markup"
                type="number"
                min="0"
                max="100"
                value={fixedScopeData?.material_markup_pct || 0}
                onChange={(e) => onFixedScopeChange({
                  ...fixedScopeData!,
                  material_markup_pct: parseFloat(e.target.value || '0')
                })}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentage added to material costs
            </p>
          </div>
        </div>
      )}

      {/* Common Fields */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div>
          <Label htmlFor="overhead" className="text-foreground">Overhead Per Job</Label>
          <div className="relative mt-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="overhead"
              type="number"
              step="0.01"
              min="0"
              value={formatCurrency(overheadPerJobCents)}
              onChange={(e) => onOverheadChange(parseCurrency(e.target.value))}
              className="pl-7"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gas, insurance, admin costs per job
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div className="flex-1">
            <Label htmlFor="urgency_toggle" className="text-foreground cursor-pointer">
              Enable Urgency Surcharge
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Charge extra for emergency or same-day service
            </p>
          </div>
          <Switch
            id="urgency_toggle"
            checked={enableUrgencySurcharge}
            onCheckedChange={onEnableUrgencySurchargeChange}
          />
        </div>

        {enableUrgencySurcharge && (
          <div>
            <Label htmlFor="urgency_pct" className="text-foreground">Urgency Surcharge %</Label>
            <div className="relative mt-2">
              <Input
                id="urgency_pct"
                type="number"
                min="0"
                max="100"
                value={urgencySurchargePct}
                onChange={(e) => onUrgencySurchargeChange(parseFloat(e.target.value || '0'))}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
