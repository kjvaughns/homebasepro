import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function QuotesManagement() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          profiles!quotes_homeowner_id_fkey(full_name, phone),
          bookings(id, status, date_time_start)
        `)
        .eq('provider_org_id', org.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingQuotes = quotes.filter(q => q.status === 'pending');
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
  const declinedQuotes = quotes.filter(q => q.status === 'declined');

  const QuoteCard = ({ quote }: { quote: any }) => {
    const statusConfig = {
      pending: { icon: Clock, color: "bg-yellow-500", label: "Pending" },
      accepted: { icon: CheckCircle, color: "bg-green-500", label: "Accepted" },
      declined: { icon: XCircle, color: "bg-red-500", label: "Declined" }
    };

    const config = statusConfig[quote.status as keyof typeof statusConfig];
    const Icon = config.icon;
    const isExpired = new Date(quote.valid_until) < new Date();

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{quote.service_name}</CardTitle>
              <CardDescription>
                {quote.profiles?.full_name || "Client"} • {format(new Date(quote.created_at), 'MMM d, yyyy')}
              </CardDescription>
            </div>
            <Badge variant="outline" className={config.color}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quote Amount</span>
            <span className="text-lg font-bold">${(quote.total_amount / 100).toFixed(2)}</span>
          </div>

          {quote.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {quote.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {isExpired ? (
              <span className="text-destructive">Expired</span>
            ) : (
              <span>Valid until {format(new Date(quote.valid_until), 'MMM d, yyyy')}</span>
            )}
          </div>

          {quote.status === 'accepted' && quote.bookings && quote.bookings.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">
                Scheduled: {format(new Date(quote.bookings[0].date_time_start), 'MMM d, h:mm a')}
              </span>
            </div>
          )}

          {quote.ai_generated && (
            <Badge variant="secondary" className="text-xs">
              AI-Generated • {Math.round((quote.ai_confidence || 0) * 100)}% Confidence
            </Badge>
          )}

          <div className="flex gap-2 mt-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate(`/provider/schedule`)}
              className="flex-1"
            >
              View Details
            </Button>
            {quote.status === 'accepted' && quote.bookings && quote.bookings.length > 0 && (
              <Button 
                size="sm"
                onClick={() => navigate('/provider/schedule')}
                className="flex-1"
              >
                Go to Job
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">
            Manage all quotes sent to clients
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{quotes.length}</div>
          <div className="text-sm text-muted-foreground">Total Quotes</div>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined ({declinedQuotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingQuotes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingQuotes.map(quote => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending quotes</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="mt-6">
          {acceptedQuotes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {acceptedQuotes.map(quote => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No accepted quotes</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="declined" className="mt-6">
          {declinedQuotes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {declinedQuotes.map(quote => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No declined quotes</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
