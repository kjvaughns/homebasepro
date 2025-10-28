import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, CheckCircle2, XCircle, MessageSquare, Download, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface QuoteViewerProps {
  quoteId: string;
  onStatusChange?: () => void;
}

interface Quote {
  id: string;
  quote_type: string;
  service_name: string;
  description: string | null;
  labor_cost: number | null;
  parts_cost: number | null;
  total_amount: number;
  line_items: any;
  valid_until: string | null;
  status: string;
  ai_generated: boolean;
  ai_confidence: number | null;
  pricing_factors: any;
  created_at: string;
  accepted_at?: string;
  organizations: {
    name: string;
    rating_avg: number;
    rating_count: number;
  };
}

export function QuoteViewer({ quoteId, onStatusChange }: QuoteViewerProps) {
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useState(() => {
    loadQuote();
  });

  const loadQuote = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          organizations (name, rating_avg, rating_count)
        `)
        .eq("id", quoteId)
        .single();

      if (error) throw error;
      setQuote(data);
    } catch (error) {
      console.error("Error loading quote:", error);
      toast.error("Failed to load quote");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq("id", quoteId);

      if (error) throw error;

      toast.success("Quote accepted! Your service will be scheduled soon.");
      
      if (onStatusChange) {
        onStatusChange();
      }
      
      loadQuote();
    } catch (error) {
      console.error("Error accepting quote:", error);
      toast.error("Failed to accept quote");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsRejecting(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq("id", quoteId);

      if (error) throw error;

      toast.success("Quote rejected");
      
      if (onStatusChange) {
        onStatusChange();
      }
      
      loadQuote();
      setShowRejectForm(false);
    } catch (error) {
      console.error("Error rejecting quote:", error);
      toast.error("Failed to reject quote");
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: "Pending Review", variant: "secondary" as const },
      accepted: { label: "Accepted", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
      expired: { label: "Expired", variant: "outline" as const },
      superseded: { label: "Updated", variant: "outline" as const }
    };
    const statusConfig = config[status as keyof typeof config] || config.pending;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  if (loading) {
    return <div>Loading quote...</div>;
  }

  if (!quote) {
    return <div>Quote not found</div>;
  }

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
  const canTakeAction = quote.status === 'pending' && !isExpired;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {quote.service_name}
            </CardTitle>
            <CardDescription className="mt-1">
              From {quote.organizations.name}
              {quote.organizations.rating_avg > 0 && (
                <span className="ml-2">
                  ⭐ {quote.organizations.rating_avg.toFixed(1)} ({quote.organizations.rating_count} reviews)
                </span>
              )}
            </CardDescription>
          </div>
          {getStatusBadge(quote.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {quote.ai_generated && quote.ai_confidence && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">AI-Assisted Quote</p>
              <p className="text-xs text-muted-foreground mt-1">
                This quote was generated using AI analysis with {(quote.ai_confidence * 100).toFixed(0)}% confidence.
                Pricing is based on similar jobs in your area.
              </p>
            </div>
          </div>
        )}

        {quote.description && (
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{quote.description}</p>
          </div>
        )}

        <Separator />

        <div>
          <h4 className="font-medium mb-3">Pricing Breakdown</h4>
          <div className="space-y-2">
            {quote.labor_cost && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor</span>
                <span className="font-medium">${(quote.labor_cost / 100).toFixed(2)}</span>
              </div>
            )}
            {quote.parts_cost && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parts & Materials</span>
                <span className="font-medium">${(quote.parts_cost / 100).toFixed(2)}</span>
              </div>
            )}
            
            {quote.line_items && Array.isArray(quote.line_items) && quote.line_items.length > 0 && (
              <div className="mt-3 space-y-2">
                {quote.line_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm pl-4 border-l-2 border-muted">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <span className="font-medium">${(item.amount / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator className="my-3" />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">${(quote.total_amount / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {quote.valid_until && (
          <div className="text-sm text-muted-foreground">
            {isExpired ? (
              <span className="text-destructive">Quote expired on {format(new Date(quote.valid_until), "PPP")}</span>
            ) : (
              <span>Valid until {format(new Date(quote.valid_until), "PPP")}</span>
            )}
          </div>
        )}

        {quote.pricing_factors && Object.keys(quote.pricing_factors).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 text-sm">Pricing Factors</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(quote.pricing_factors).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {showRejectForm && (
          <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <Label htmlFor="rejection-reason">Why are you rejecting this quote?</Label>
            <Textarea
              id="rejection-reason"
              placeholder="e.g., Price too high, need different services, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="flex-1"
              >
                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason("");
                }}
                disabled={isRejecting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {canTakeAction && (
        <CardFooter className="flex gap-2">
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isAccepting ? "Accepting..." : "Accept Quote"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRejectForm(true)}
            disabled={showRejectForm}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(`/homeowner/messages?provider=${quote.organizations.name}`)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </CardFooter>
      )}

      {quote.status === 'accepted' && (
        <CardFooter>
          <div className="w-full text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 inline mr-2 text-primary" />
            Quote accepted on {format(new Date(quote.accepted_at!), "PPP")}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
