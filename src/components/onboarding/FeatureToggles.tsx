import { Switch } from "@/components/ui/switch";

interface Features {
  quote_followups: boolean;
  payment_reminders: boolean;
  review_requests: boolean;
  appointment_reminders: boolean;
}

interface FeatureTogglesProps {
  value: Features;
  onChange: (value: Features) => void;
}

const FEATURES = [
  { key: 'quote_followups', label: 'Quote follow-ups', desc: 'Remind clients about pending quotes' },
  { key: 'payment_reminders', label: 'Payment reminders', desc: 'Auto-send payment reminders' },
  { key: 'review_requests', label: 'Review requests', desc: 'Ask for reviews after completed jobs' },
  { key: 'appointment_reminders', label: 'Appointment reminders', desc: 'Send appointment reminders' }
] as const;

export function FeatureToggles({ value, onChange }: FeatureTogglesProps) {
  const handleToggle = (key: keyof Features) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="space-y-2">
      {FEATURES.map((feature) => (
        <div 
          key={feature.key}
          className="flex items-center justify-between p-3 rounded-xl border"
          style={{
            background: 'hsla(var(--onboarding-card))',
            borderColor: 'hsla(var(--onboarding-border))'
          }}
        >
          <div>
            <p className="font-bold text-sm" style={{ color: 'hsl(var(--onboarding-text))' }}>
              {feature.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--onboarding-muted))' }}>
              {feature.desc}
            </p>
          </div>
          <Switch
            checked={value[feature.key]}
            onCheckedChange={() => handleToggle(feature.key)}
          />
        </div>
      ))}
    </div>
  );
}