import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  FileText,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientAITabProps {
  client: any;
}

export default function ClientAITab({ client }: ClientAITabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);
  const [churnRisk, setChurnRisk] = useState<any>(null);
  const [upsellSuggestions, setUpsellSuggestions] = useState<string[]>([]);

  const generateSummary = async () => {
    setLoading("summary");
    try {
      // Call AI edge function
      const { data, error } = await supabase.functions.invoke("crm-ai", {
        body: {
          action: "summarize_client",
          client_id: client.id,
        },
      });

      if (error) throw error;

      setSummary(data.summary);
    } catch (error: any) {
      console.error("Error generating summary:", error);
      // Fallback to template-based summary
      const daysSinceLastService = client.last_job_date
        ? Math.floor(
            (Date.now() - new Date(client.last_job_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      const templateSummary = `
• Active since ${client.created_at ? new Date(client.created_at).toLocaleDateString() : "unknown"}
• ${client.total_jobs} jobs completed
• Last service: ${
        daysSinceLastService
          ? `${daysSinceLastService} days ago`
          : "No service yet"
      }
• Outstanding balance: $${client.outstanding_balance.toLocaleString()}
• Lifetime value: $${client.lifetime_value.toLocaleString()}
      `.trim();

      setSummary(templateSummary);
    } finally {
      setLoading(null);
    }
  };

  const generateReply = async () => {
    setLoading("reply");
    try {
      const { data, error } = await supabase.functions.invoke("crm-ai", {
        body: {
          action: "suggest_replies",
          client_id: client.id,
          count: 1,
        },
      });

      if (error) throw error;

      setSuggestedReply(data.replies[0]);
    } catch (error: any) {
      console.error("Error generating reply:", error);
      setSuggestedReply(
        `Hi ${client.name.split(" ")[0]}, thanks for reaching out! I wanted to follow up on your recent inquiry. How can I help you today?`
      );
    } finally {
      setLoading(null);
    }
  };

  const analyzeChurn = async () => {
    setLoading("churn");
    try {
      const { data, error } = await supabase.functions.invoke("crm-ai", {
        body: {
          action: "churn_analysis",
          client_id: client.id,
        },
      });

      if (error) throw error;

      setChurnRisk(data);
    } catch (error: any) {
      console.error("Error analyzing churn:", error);
      // Calculate basic churn risk
      const daysSinceLastService = client.last_job_date
        ? Math.floor(
            (Date.now() - new Date(client.last_job_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

      let risk = "low";
      let factors = [];

      if (daysSinceLastService > 120) {
        risk = "high";
        factors.push(`No service in ${daysSinceLastService} days`);
      } else if (daysSinceLastService > 60) {
        risk = "medium";
        factors.push(`${daysSinceLastService} days since last service`);
      }

      if (client.outstanding_balance > 100) {
        if (risk === "low") risk = "medium";
        else if (risk === "medium") risk = "high";
        factors.push(`$${client.outstanding_balance} unpaid balance`);
      }

      if (factors.length === 0) {
        factors.push("Regular service schedule maintained");
        factors.push("No outstanding payments");
      }

      setChurnRisk({ risk, factors });
    } finally {
      setLoading(null);
    }
  };

  const generateUpsells = async () => {
    setLoading("upsell");
    try {
      const { data, error } = await supabase.functions.invoke("crm-ai", {
        body: {
          action: "upsell_suggestions",
          client_id: client.id,
        },
      });

      if (error) throw error;

      setUpsellSuggestions(data.suggestions);
    } catch (error: any) {
      console.error("Error generating upsells:", error);
      // Template-based suggestions
      const suggestions = [
        "Add gutter cleaning to lawn service package",
        "Seasonal power washing bundle (20% off)",
        "Annual maintenance plan with priority scheduling",
      ];
      setUpsellSuggestions(suggestions);
    } finally {
      setLoading(null);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Actions Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Account Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Get an AI-generated summary of this client's history and status
          </p>
          <Button
            onClick={generateSummary}
            disabled={loading === "summary"}
            className="w-full"
          >
            {loading === "summary" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Summarize Account
              </>
            )}
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Suggested Reply</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Get AI-drafted message based on recent interactions
          </p>
          <Button
            onClick={generateReply}
            disabled={loading === "reply"}
            className="w-full"
          >
            {loading === "reply" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Draft Reply
              </>
            )}
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Churn Risk</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Analyze likelihood of client leaving based on engagement
          </p>
          <Button
            onClick={analyzeChurn}
            disabled={loading === "churn"}
            className="w-full"
          >
            {loading === "churn" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 mr-2" />
                Analyze Risk
              </>
            )}
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Upsell Opportunities</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Find relevant add-ons and upgrades for this client
          </p>
          <Button
            onClick={generateUpsells}
            disabled={loading === "upsell"}
            className="w-full"
          >
            {loading === "upsell" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finding...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Find Opportunities
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Results */}
      {summary && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Account Summary
          </h3>
          <div className="whitespace-pre-line text-sm">{summary}</div>
        </Card>
      )}

      {suggestedReply && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Suggested Reply
          </h3>
          <p className="text-sm mb-3">{suggestedReply}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(suggestedReply);
              toast({ title: "Copied to clipboard" });
            }}
          >
            Copy to Clipboard
          </Button>
        </Card>
      )}

      {churnRisk && (
        <Card className={`p-4 ${getRiskColor(churnRisk.risk)}`}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Churn Risk Analysis
          </h3>
          <Badge className={getRiskColor(churnRisk.risk)} variant="outline">
            {churnRisk.risk.toUpperCase()} RISK
          </Badge>
          <ul className="mt-3 space-y-1 text-sm">
            {churnRisk.factors.map((factor: string, i: number) => (
              <li key={i}>• {factor}</li>
            ))}
          </ul>
        </Card>
      )}

      {upsellSuggestions.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Upsell Opportunities
          </h3>
          <ul className="space-y-2">
            {upsellSuggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
