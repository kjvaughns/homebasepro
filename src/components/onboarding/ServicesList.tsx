interface Service {
  name: string;
  description: string;
  base_price_cents: number;
  duration_minutes: number;
}

interface ServicesListProps {
  services: Service[];
}

export function ServicesList({ services }: ServicesListProps) {
  return (
    <div className="space-y-2 mt-4">
      {services.map((service, i) => (
        <div 
          key={i}
          className="rounded-full px-3 py-2 flex items-center gap-2 border"
          style={{
            background: 'hsla(var(--onboarding-card))',
            borderColor: 'hsla(var(--onboarding-border))'
          }}
        >
          <span className="font-semibold text-sm" style={{ color: 'hsl(var(--onboarding-text))' }}>
            {service.name}
          </span>
          <span className="text-xs ml-auto" style={{ color: 'hsl(var(--onboarding-muted))' }}>
            ${(service.base_price_cents / 100).toFixed(0)}
          </span>
          <span className="text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
            • {service.duration_minutes}m
          </span>
        </div>
      ))}
    </div>
  );
}