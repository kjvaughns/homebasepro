import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteViewer } from "@/components/homeowner/QuoteViewer";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Quotes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [showQuoteViewer, setShowQuoteViewer] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          provider:organizations!quotes_provider_org_id_fkey(name, rating_avg)
        `)
        .eq("homeowner_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Error loading quotes:", error);
      toast({
        title: "Error",
        description: "Failed to load quotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", quoteId);

      if (error) throw error;

      toast({
        title: "Quote Accepted",
        description: "The provider will be notified and schedule your service.",
      });

      loadQuotes();
      setShowQuoteViewer(false);
    } catch (error) {
      console.error("Error accepting quote:", error);
      toast({
        title: "Error",
        description: "Failed to accept quote",
        variant: "destructive",
      });
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "rejected" })
        .eq("id", quoteId);

      if (error) throw error;

      toast({
        title: "Quote Declined",
        description: "You can request a new quote anytime.",
      });

      loadQuotes();
      setShowQuoteViewer(false);
    } catch (error) {
      console.error("Error rejecting quote:", error);
      toast({
        title: "Error",
        description: "Failed to decline quote",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Quotes</h1>
        <p className="text-muted-foreground">Review and manage quotes from service providers</p>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Request services from providers to receive quotes
            </p>
            <Button onClick={() => navigate("/homeowner/browse")}>
              Browse Providers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card
              key={quote.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedQuote(quote);
                setShowQuoteViewer(true);
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(quote.status)}
                      <h3 className="text-lg font-semibold">
                        {quote.provider?.name}
                      </h3>
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </p>
                    {quote.status === "pending" && (
                      <Badge variant="outline" className="mt-2">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting your response
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ${quote.total_amount.toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuote(quote);
                        setShowQuoteViewer(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quote Viewer Dialog */}
      {selectedQuote && (
        <Dialog open={showQuoteViewer} onOpenChange={setShowQuoteViewer}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <QuoteViewer
              quoteId={selectedQuote.id}
              onStatusChange={() => {
                loadQuotes();
                setShowQuoteViewer(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
