import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface PricingPreferences {
  min: number;
  avg: number;
  max: number;
}

interface PricingSlidersProps {
  value: PricingPreferences;
  onChange: (value: PricingPreferences) => void;
}

export function PricingSliders({ value, onChange }: PricingSlidersProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between mb-2">
          <Label style={{ color: 'hsl(var(--onboarding-muted))' }}>Minimum</Label>
          <span className="text-sm" style={{ color: 'hsl(var(--onboarding-muted))' }}>
            ${value.min}
          </span>
        </div>
        <Slider
          value={[value.min]}
          onValueChange={(val) => onChange({ ...value, min: val[0] })}
          min={10}
          max={500}
          step={5}
          className="cursor-pointer"
        />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <Label style={{ color: 'hsl(var(--onboarding-muted))' }}>Average</Label>
          <span className="text-sm" style={{ color: 'hsl(var(--onboarding-muted))' }}>
            ${value.avg}
          </span>
        </div>
        <Slider
          value={[value.avg]}
          onValueChange={(val) => onChange({ ...value, avg: val[0] })}
          min={50}
          max={2000}
          step={25}
          className="cursor-pointer"
        />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <Label style={{ color: 'hsl(var(--onboarding-muted))' }}>Maximum</Label>
          <span className="text-sm" style={{ color: 'hsl(var(--onboarding-muted))' }}>
            ${value.max}
          </span>
        </div>
        <Slider
          value={[value.max]}
          onValueChange={(val) => onChange({ ...value, max: val[0] })}
          min={500}
          max={10000}
          step={100}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
}