import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, Meh, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Reviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ avg: 0, total: 0, positive: 0, neutral: 0, negative: 0 });
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState("");

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          *,
          homeowner:profiles!reviews_homeowner_profile_id_fkey(full_name, avatar_url)
        `)
        .eq("provider_org_id", org.id)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (reviewsData) {
        setReviews(reviewsData);
        
        const total = reviewsData.length;
        const avg = total > 0 ? reviewsData.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / total : 0;
        const positive = reviewsData.filter((r: any) => r.sentiment === 'positive').length;
        const neutral = reviewsData.filter((r: any) => r.sentiment === 'neutral').length;
        const negative = reviewsData.filter((r: any) => r.sentiment === 'negative').length;
        
        setStats({ avg, total, positive, neutral, negative });
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (reviewId: string) => {
    if (!response.trim()) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success("Response posted successfully");
      setRespondingTo(null);
      setResponse("");
      loadReviews();
    } catch (error) {
      console.error("Error posting response:", error);
      toast.error("Failed to post response");
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      default:
        return <Meh className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reviews & Ratings</h1>
        <p className="text-muted-foreground">Client feedback and testimonials</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avg.toFixed(1)}</div>
            <div className="flex gap-1 mt-2">
              {renderStars(Math.round(stats.avg))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Positive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.positive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.negative}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No reviews yet</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{review.homeowner?.full_name || 'Anonymous'}</CardTitle>
                      {review.sentiment && getSentimentIcon(review.sentiment)}
                    </div>
                    <div className="flex gap-1">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(review.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.comment && (
                  <p className="text-sm">{review.comment}</p>
                )}

                {review.provider_response ? (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Your Response:</p>
                    <p className="text-sm">{review.provider_response}</p>
                    {review.provider_responded_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(review.provider_responded_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                ) : respondingTo === review.id ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write your response..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRespond(review.id)}>
                        Post Response
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRespondingTo(null);
                          setResponse("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRespondingTo(review.id)}
                  >
                    Respond
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
