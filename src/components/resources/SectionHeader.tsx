interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export function SectionHeader({ eyebrow, title, subtitle, centered = true }: SectionHeaderProps) {
  return (
    <div className={`space-y-3 ${centered ? 'text-center' : ''} ${centered ? 'max-w-3xl mx-auto' : ''}`}>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
          <span className="text-sm font-medium">{eyebrow}</span>
        </div>
      )}
      <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
      {subtitle && (
        <p className="text-lg text-muted-foreground leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
