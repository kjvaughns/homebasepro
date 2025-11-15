import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MarketAnalysis {
  local_median_cents: number;
  your_vs_market_pct: number;
  assessment: string;
  confidence: string;
  reasoning: string;
}

interface MarketDataDisplayProps {
  yourRate: number;
  analysis: MarketAnalysis;
}

export function MarketDataDisplay({ yourRate, analysis }: MarketDataDisplayProps) {
  const getAssessmentColor = () => {
    if (analysis.your_vs_market_pct >= -10 && analysis.your_vs_market_pct <= 10) {
      return 'text-green-600 dark:text-green-400';
    }
    if (analysis.your_vs_market_pct < -10) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-red-600 dark:text-red-400';
  };

  const getIcon = () => {
    if (analysis.your_vs_market_pct >= -10 && analysis.your_vs_market_pct <= 10) {
      return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
    }
    if (analysis.your_vs_market_pct < -10) {
      return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
  };

  const getConfidenceValue = () => {
    const confidenceLower = analysis.confidence.toLowerCase();
    if (confidenceLower.includes('high')) return 85;
    if (confidenceLower.includes('medium')) return 65;
    return 45;
  };

  return (
    <div className="space-y-4 p-6 rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-1">Market Analysis</h4>
          <p className={`text-sm font-medium ${getAssessmentColor()}`}>
            {analysis.assessment}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Your Rate</p>
          <p className="text-2xl font-bold text-foreground">
            ${(yourRate / 100).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Market Median</p>
          <p className="text-2xl font-bold text-foreground">
            ${(analysis.local_median_cents / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-foreground">vs Market</p>
          <div className="flex items-center gap-1">
            {analysis.your_vs_market_pct > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className={`text-sm font-medium ${getAssessmentColor()}`}>
              {analysis.your_vs_market_pct > 0 ? '+' : ''}
              {analysis.your_vs_market_pct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-md bg-muted/50">
        <p className="text-sm text-foreground mb-2 font-medium">AI Insight</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {analysis.reasoning}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Confidence Level</p>
          <p className="text-xs font-medium text-foreground">{analysis.confidence}</p>
        </div>
        <Progress value={getConfidenceValue()} className="h-2" />
      </div>
    </div>
  );
}
