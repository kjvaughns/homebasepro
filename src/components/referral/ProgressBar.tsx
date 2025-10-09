interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
}

export function ProgressBar({ current, target, label }: ProgressBarProps) {
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const isComplete = current >= target;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">
          {label || 'Progress'}
        </span>
        <span className="text-muted-foreground">
          {current}/{target} {isComplete && '🎉'}
        </span>
      </div>
      
      <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
        </div>
      </div>

      <div className="text-right">
        <span className="text-xs font-semibold text-primary">
          {percentage}%
        </span>
      </div>
    </div>
  );
}
