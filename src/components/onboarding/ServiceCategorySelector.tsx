import { Wrench, ClipboardList } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ServiceCategorySelectorProps {
  value: 'service_call' | 'fixed_scope' | '';
  onChange: (value: 'service_call' | 'fixed_scope') => void;
  tradeType: string;
}

export function ServiceCategorySelector({ value, onChange, tradeType }: ServiceCategorySelectorProps) {
  const getRecommendation = () => {
    const serviceTrades = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair'];
    if (serviceTrades.includes(tradeType)) {
      return 'service_call';
    }
    return 'fixed_scope';
  };

  const recommended = getRecommendation();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--onboarding-text))' }}>
          How do you typically price your services?
        </h3>
        <p className="text-sm" style={{ color: 'hsl(var(--onboarding-muted))' }}>
          This helps us provide better pricing guidance for your business
        </p>
      </div>

      <RadioGroup value={value} onValueChange={(v) => onChange(v as 'service_call' | 'fixed_scope')}>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Service Call Option */}
          <div className="relative">
            <RadioGroupItem value="service_call" id="service_call" className="sr-only" />
            <Label
              htmlFor="service_call"
              className={`flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all ${
                value === 'service_call'
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Wrench className={`h-6 w-6 ${value === 'service_call' ? 'text-primary' : 'text-muted-foreground'}`} />
                {recommended === 'service_call' && (
                  <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full font-medium">
                    Recommended
                  </span>
                )}
              </div>
              <h4 className="font-semibold mb-2" style={{ color: 'hsl(var(--onboarding-text))' }}>
                Service Call + Time & Materials
              </h4>
              <p className="text-sm" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                Trip charge + hourly rate. Best for diagnostic work, repairs, and troubleshooting.
              </p>
              <ul className="mt-3 space-y-1 text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                <li>• HVAC repairs</li>
                <li>• Plumbing emergencies</li>
                <li>• Electrical troubleshooting</li>
              </ul>
            </Label>
          </div>

          {/* Fixed Scope Option */}
          <div className="relative">
            <RadioGroupItem value="fixed_scope" id="fixed_scope" className="sr-only" />
            <Label
              htmlFor="fixed_scope"
              className={`flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all ${
                value === 'fixed_scope'
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <ClipboardList className={`h-6 w-6 ${value === 'fixed_scope' ? 'text-primary' : 'text-muted-foreground'}`} />
                {recommended === 'fixed_scope' && (
                  <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full font-medium">
                    Recommended
                  </span>
                )}
              </div>
              <h4 className="font-semibold mb-2" style={{ color: 'hsl(var(--onboarding-text))' }}>
                Fixed-Scope Jobs
              </h4>
              <p className="text-sm" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                Per unit, per square foot, or flat rate. Best for predictable, defined projects.
              </p>
              <ul className="mt-3 space-y-1 text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                <li>• Lawn mowing (per sqft)</li>
                <li>• Gutter cleaning (per unit)</li>
                <li>• Pressure washing (per job)</li>
              </ul>
            </Label>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
