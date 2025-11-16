import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Star, Shield, Share2, Heart, Clock, Check, MessageSquare, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FavoriteToggle } from "@/components/homeowner/FavoriteToggle";
import { PortfolioGallery } from "@/components/provider/PortfolioGallery";
import { SubmitReviewDialog } from "@/components/homeowner/SubmitReviewDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [provider, setProvider] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedHome, setSelectedHome] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  useEffect(() => {
    loadProviderDetails();
    loadUserHomes();
    loadReviews();
    loadPortfolio();
  }, [id]);

  const loadProviderDetails = async () => {
    try {
      const { data: providerData, error: providerError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      const { data: plansData, error: plansError } = await supabase
        .from("service_plans")
        .select("*")
        .eq("organization_id", id)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);
    } catch (error) {
      console.error("Error loading provider:", error);
      toast({
        title: "Error",
        description: "Failed to load provider details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserHomes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      setProfileId(profile.id);

      const { data: homesData } = await supabase
        .from("homes")
        .select("*")
        .eq("owner_id", profile.id)
        .order("is_primary", { ascending: false });

      setHomes(homesData || []);
    } catch (error) {
      console.error("Error loading homes:", error);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          homeowner:profiles!reviews_homeowner_profile_id_fkey(full_name, avatar_url)
        `)
        .eq('provider_org_id', id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const loadPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_portfolio')
        .select('*')
        .eq('org_id', id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPortfolio(data || []);
    } catch (error) {
      console.error("Error loading portfolio:", error);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedHome || !selectedPlan) {
      toast({
        title: "Error",
        description: "Please select a property",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDate || !selectedTimeSlot) {
      toast({
        title: "Error",
        description: "Please select a date and time for your first service",
        variant: "destructive",
      });
      return;
    }

    setSubscribing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Create subscription
      const { data: subscription, error: subError } = await supabase
        .from("homeowner_subscriptions")
        .insert({
          homeowner_id: profile.id,
          provider_org_id: id,
          home_id: selectedHome,
          service_plan_id: selectedPlan.id,
          billing_amount: selectedPlan.price,
          status: "active",
          next_service_date: selectedDate.toISOString(),
        })
        .select()
        .single();

      if (subError) throw subError;

      // Create first service visit
      const scheduledDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTimeSlot.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      const { error: visitError } = await supabase
        .from("service_visits")
        .insert({
          homeowner_id: profile.id,
          provider_org_id: id,
          home_id: selectedHome,
          homeowner_subscription_id: subscription.id,
          scheduled_date: scheduledDateTime.toISOString(),
          status: "scheduled",
          notes: specialInstructions,
          preferred_time_slot: selectedTimeSlot,
        });

      if (visitError) throw visitError;

      toast({
        title: "Success",
        description: "Service booked! Your first visit is scheduled.",
      });

      setDialogOpen(false);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setSpecialInstructions("");
      navigate("/homeowner/subscriptions");
    } catch (error) {
      console.error("Error subscribing:", error);
      toast({
        title: "Error",
        description: "Failed to book service",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container max-w-6xl py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Provider not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Hero Image */}
      <div className="relative h-64 bg-gradient-to-br from-primary to-accent overflow-hidden">
        {/* Placeholder for provider image - can be customized */}
        <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">
          {provider.service_type === "Lawn Care" ? "🌱" : 
           provider.service_type === "Plumbing" ? "🔧" : "⚡"}
        </div>
      </div>

      {/* Fixed Back Button - Outside hero section */}
      <div className="container max-w-4xl px-4 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/homeowner/browse")}
          className="absolute -top-56 left-4 bg-background/95 hover:bg-background z-50 shadow-md"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="container max-w-4xl px-4 -mt-8">
        {/* Discount Badge & Actions */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <Badge className="bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold rounded-full shadow-lg">
            <Shield className="h-4 w-4 mr-2" />
            SAVE UP TO 20%
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="rounded-full bg-background shadow-md hover:bg-muted">
              <Share2 className="h-4 w-4" />
            </Button>
            <FavoriteToggle 
              providerId={id!}
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md hover:bg-muted"
            />
          </div>
        </div>

        {/* Provider Info */}
        <div className="space-y-3 mb-6">
          <h1 className="text-4xl font-bold">{provider.name}</h1>
          {provider.description && (
            <p className="text-xl text-muted-foreground">{provider.description}</p>
          )}
          {provider.service_area && (
            <p className="text-base text-muted-foreground flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {provider.service_area}
            </p>
          )}
          
          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`h-5 w-5 ${
                    star <= Math.round(provider.rating_avg || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className="text-muted-foreground">
              ({provider.rating_count || 0} review{provider.rating_count !== 1 ? 's' : ''})
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            {/* Verified Badge */}
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-primary font-semibold text-lg">Verified</span>
            </div>

            <h2 className="text-2xl font-bold mb-4">Popular Services</h2>
            
            {plans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No services available at the moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {plans.map((plan, index) => (
                  <Card key={plan.id} className="overflow-hidden border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="text-xl font-bold">{plan.name}</h3>
                            {plan.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Benefits: {plan.description}
                              </p>
                            )}
                          </div>

                          {plan.includes_features && Array.isArray(plan.includes_features) && plan.includes_features.length > 0 && (
                            <ul className="space-y-1">
                              {plan.includes_features.slice(0, 3).map((feature: string, idx: number) => (
                                <li key={idx} className="flex items-start text-sm text-muted-foreground">
                                  <Check className="h-4 w-4 mr-2 text-primary flex-shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="text-sm text-muted-foreground">
                            Lowest price in 30 days, before discount: ${(plan.price / 100).toFixed(2)}
                          </div>

                          {index === 0 && (
                            <Badge variant="secondary" className="bg-secondary/50 text-primary">
                              <Shield className="h-3 w-3 mr-1" />
                              Save up to 20%
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <div className="text-3xl font-bold">
                              ${(plan.price / 100).toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {plan.billing_frequency}
                            </div>
                          </div>
                          
                          {homes.length === 0 ? (
                            <Button
                              size="lg"
                              className="bg-primary hover:bg-primary/90 px-8"
                              onClick={() => navigate("/homeowner/homes/new")}
                            >
                              Add Property First
                            </Button>
                          ) : (
                            <Dialog open={dialogOpen && selectedPlan?.id === plan.id} onOpenChange={(open) => {
                              setDialogOpen(open);
                              if (!open) {
                                setSelectedPlan(null);
                                setSelectedDate(undefined);
                                setSelectedTimeSlot("");
                                setSpecialInstructions("");
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="lg"
                                  className="bg-primary hover:bg-primary/90 px-8"
                                  onClick={() => setSelectedPlan(plan)}
                                >
                                  Book
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Book {plan.name}</DialogTitle>
                                  <DialogDescription>
                                    Schedule your first service visit
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <Label>Select Property</Label>
                                    <Select value={selectedHome} onValueChange={setSelectedHome}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose a property" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {homes.map((home) => (
                                          <SelectItem key={home.id} value={home.id}>
                                            {home.name} - {home.address}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label>Select Date</Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !selectedDate && "text-muted-foreground"
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={selectedDate}
                                          onSelect={setSelectedDate}
                                          disabled={(date) => date < new Date()}
                                          initialFocus
                                          className="pointer-events-auto"
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>

                                  <div>
                                    <Label>Select Time Slot</Label>
                                    <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose a time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="08:00">Morning (8:00 AM - 12:00 PM)</SelectItem>
                                        <SelectItem value="13:00">Afternoon (1:00 PM - 5:00 PM)</SelectItem>
                                        <SelectItem value="17:00">Evening (5:00 PM - 8:00 PM)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label>Special Instructions (Optional)</Label>
                                    <Textarea
                                      placeholder="Any specific requirements or access instructions..."
                                      value={specialInstructions}
                                      onChange={(e) => setSpecialInstructions(e.target.value)}
                                      className="resize-none"
                                      rows={3}
                                    />
                                  </div>

                                  <Button
                                    onClick={handleSubscribe}
                                    disabled={subscribing || !selectedHome || !selectedDate || !selectedTimeSlot}
                                    className="w-full"
                                  >
                                    {subscribing ? "Booking..." : "Confirm Booking"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>

                      {index < plans.length - 1 && <Separator className="mt-4" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  Customer Reviews ({reviews.length})
                </h3>
                {profileId && (
                  <Button onClick={() => setReviewDialogOpen(true)}>
                    Write a Review
                  </Button>
                )}
              </div>

              {reviews.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No reviews yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-6 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={review.homeowner?.avatar_url} />
                              <AvatarFallback>
                                {review.homeowner?.full_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">
                                {review.homeowner?.full_name || 'Anonymous'}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= review.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-muted-foreground"
                                      }`}
                                    />
                                  ))}
                                </div>
                                {review.is_verified && (
                                  <Badge variant="secondary" className="text-xs">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(review.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>

                        {review.title && (
                          <h4 className="font-semibold">{review.title}</h4>
                        )}
                        
                        {review.comment && (
                          <p className="text-muted-foreground">{review.comment}</p>
                        )}

                        {review.provider_response && (
                          <div className="mt-4 pl-4 border-l-2 border-primary/20">
                            <p className="text-sm font-medium mb-1">Provider Response:</p>
                            <p className="text-sm text-muted-foreground">
                              {review.provider_response}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <SubmitReviewDialog
              open={reviewDialogOpen}
              onOpenChange={setReviewDialogOpen}
              providerOrgId={id!}
              providerName={provider.name}
              homeownerProfileId={profileId}
            />
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioGallery images={portfolio} />
          </TabsContent>

          <TabsContent value="about">
            <Card>
              <CardContent className="p-6 space-y-4">
                {provider.service_type && (
                  <div>
                    <h3 className="font-semibold mb-2">Service Type</h3>
                    <Badge variant="secondary">{provider.service_type}</Badge>
                  </div>
                )}
                {provider.service_area && (
                  <div>
                    <h3 className="font-semibold mb-2">Service Area</h3>
                    <p className="text-muted-foreground flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {provider.service_area}
                    </p>
                  </div>
                )}
                {provider.phone && (
                  <div>
                    <h3 className="font-semibold mb-2">Contact</h3>
                    <p className="text-muted-foreground">{provider.phone}</p>
                  </div>
                )}
                {provider.email && (
                  <div>
                    <h3 className="font-semibold mb-2">Email</h3>
                    <p className="text-muted-foreground">{provider.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
