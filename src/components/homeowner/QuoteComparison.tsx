import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Star, TrendingUp, Sparkles } from "lucide-react";
import { QuoteViewer } from "./QuoteViewer";

interface QuoteComparisonProps {
  serviceRequestId: string;
}

interface ComparisonQuote {
  id: string;
  provider_org_id: string;
  total_amount: number;
  quote_type: string;
  service_name: string;
  ai_generated: boolean;
  ai_confidence: number | null;
  valid_until: string | null;
  status: string;
  created_at: string;
  organizations: {
    name: string;
    rating_avg: number;
    rating_count: number;
  };
}

export function QuoteComparison({ serviceRequestId }: QuoteComparisonProps) {
  const [quotes, setQuotes] = useState<ComparisonQuote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, [serviceRequestId]);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          id,
          provider_org_id,
          total_amount,
          quote_type,
          service_name,
          ai_generated,
          ai_confidence,
          valid_until,
          status,
          created_at,
          organizations (name, rating_avg, rating_count)
        `)
        .eq("service_request_id", serviceRequestId)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Error loading quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading quotes...</div>;
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Quotes Yet</CardTitle>
          <CardDescription>
            Providers haven't sent quotes for this request yet. Check back soon!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (quotes.length === 1 || selectedQuoteId) {
    return (
      <div className="space-y-4">
        {quotes.length > 1 && (
          <Button
            variant="outline"
            onClick={() => setSelectedQuoteId(null)}
            size="sm"
          >
            ← Back to Comparison
          </Button>
        )}
        <QuoteViewer 
          quoteId={selectedQuoteId || quotes[0].id} 
          onStatusChange={loadQuotes}
        />
      </div>
    );
  }

  // Calculate statistics
  const validQuotes = quotes.filter(q => q.status === 'pending');
  const avgPrice = validQuotes.reduce((sum, q) => sum + q.total_amount, 0) / validQuotes.length;
  const minPrice = Math.min(...validQuotes.map(q => q.total_amount));
  const maxPrice = Math.max(...validQuotes.map(q => q.total_amount));

  // Find best value (lowest price with good rating)
  const rankedQuotes = [...validQuotes].sort((a, b) => {
    const aScore = (a.organizations.rating_avg * 20) - (a.total_amount / 100);
    const bScore = (b.organizations.rating_avg * 20) - (b.total_amount / 100);
    return bScore - aScore;
  });
  const bestValueId = rankedQuotes[0]?.id;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Compare {quotes.length} Quotes
          </CardTitle>
          <CardDescription>
            Review quotes from different providers to find the best fit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Average</p>
              <p className="text-lg font-bold">${(avgPrice / 100).toFixed(2)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Lowest</p>
              <p className="text-lg font-bold text-primary">${(minPrice / 100).toFixed(2)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Highest</p>
              <p className="text-lg font-bold">${(maxPrice / 100).toFixed(2)}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-3">
            {quotes.map((quote) => (
              <Card 
                key={quote.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedQuoteId(quote.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{quote.organizations.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {quote.organizations.rating_avg > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{quote.organizations.rating_avg.toFixed(1)}</span>
                            <span className="text-muted-foreground">
                              ({quote.organizations.rating_count})
                            </span>
                          </div>
                        )}
                        {quote.ai_generated && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI-Assisted
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ${(quote.total_amount / 100).toFixed(2)}
                      </p>
                      {quote.id === bestValueId && (
                        <Badge variant="default" className="mt-1">
                          Best Value
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(quote.created_at).toLocaleDateString()}
                      </span>
                      {quote.valid_until && (
                        <span className="text-xs">
                          Valid until {new Date(quote.valid_until).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details →
                    </Button>
                  </div>

                  {quote.status === 'accepted' && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">Accepted</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm">
            <strong>💡 Tip:</strong> Consider both price and provider reputation. 
            The lowest price isn't always the best value. Check reviews and response times.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
