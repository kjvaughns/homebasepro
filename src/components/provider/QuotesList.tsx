import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";

export function QuotesList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    conversionRate: 0
  });

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) throw new Error("Organization not found");

      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          profiles (full_name, email),
          homes (street_address, city, state)
        `)
        .eq("provider_org_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setQuotes(data || []);

      // Calculate stats
      const pending = data?.filter(q => q.status === 'pending').length || 0;
      const accepted = data?.filter(q => q.status === 'accepted').length || 0;
      const rejected = data?.filter(q => q.status === 'rejected').length || 0;
      const total = accepted + rejected;
      const conversionRate = total > 0 ? (accepted / total) * 100 : 0;

      setStats({ pending, accepted, rejected, conversionRate });
    } catch (error) {
      console.error("Error loading quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "secondary",
      accepted: "default",
      rejected: "destructive",
      expired: "outline",
      superseded: "outline"
    };
    return colors[status as keyof typeof colors] || "secondary";
  };

  const filterQuotes = (status: string) => {
    if (status === 'all') return quotes;
    return quotes.filter(q => q.status === status);
  };

  if (loading) {
    return <div>Loading quotes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-primary">{stats.accepted}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion</p>
                <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>

            {['all', 'pending', 'accepted', 'rejected', 'expired'].map((status) => (
              <TabsContent key={status} value={status} className="space-y-3 mt-4">
                {filterQuotes(status).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No {status !== 'all' ? status : ''} quotes found
                  </div>
                ) : (
                  filterQuotes(status).map((quote) => (
                    <Card
                      key={quote.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/provider/quotes/${quote.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{quote.service_name}</h4>
                              <Badge variant={getStatusColor(quote.status) as any}>
                                {quote.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {quote.profiles.full_name} • {quote.profiles.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {quote.homes.street_address}, {quote.homes.city}, {quote.homes.state}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(quote.created_at), "PPP")}
                              </span>
                              {quote.valid_until && (
                                <span>
                                  Valid until {format(new Date(quote.valid_until), "PP")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              ${(quote.total_amount / 100).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {quote.quote_type}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
