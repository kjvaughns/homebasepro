import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Gift, ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setReferralCookie, storeReferralInSession } from "@/utils/referralTracking";
import { useToast } from "@/hooks/use-toast";
import homebaseLogo from "@/assets/homebase-logo.png";
import { SEO } from "@/components/SEO";

export default function JoinWithRef() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPartner = async () => {
      const refSlug = searchParams.get('ref');
      
      if (!refSlug) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        // Track click
        await supabase.functions.invoke('partner-track-click', {
          body: { referralSlug: refSlug }
        });

        // Get partner details
        const { data, error: fetchError } = await supabase
          .from('partners')
          .select('*')
          .eq('referral_slug', refSlug)
          .eq('status', 'ACTIVE')
          .single();

        if (fetchError || !data) {
          console.error('Partner not found:', fetchError);
          setError(true);
          setLoading(false);
          return;
        }

        setPartner(data);
        
        // Set cookie and session storage
        setReferralCookie(refSlug);
        storeReferralInSession(refSlug);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading partner:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadPartner();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Invalid Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">This referral link is no longer valid.</p>
            <Button onClick={() => navigate('/')}>Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {partner && (
        <SEO
          title={`Join HomeBase with ${partner.name} - Get ${partner.discount_offer}`}
          description={`${partner.name} invites you to join HomeBase. Get ${partner.discount_offer} on your first service. Connect with verified home service providers.`}
          ogImage={partner.avatar_url || 'https://homebaseproapp.com/og-image.png'}
          canonical={`https://homebaseproapp.com/join?ref=${searchParams.get('ref')}`}
        />
      )}
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
            <span className="text-2xl font-bold">HomeBase</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
              <Gift className="h-3 w-3 mr-1" />
              You've Been Referred!
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to HomeBase
            </h1>
            
            <p className="text-xl text-muted-foreground mb-6">
              Join thousands of homeowners and service providers who trust HomeBase
            </p>

            {/* Discount Badge */}
            <Card className="inline-block p-6 border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5 mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-primary rounded-full p-3">
                  <Gift className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Your exclusive offer</p>
                  <p className="text-2xl font-bold text-primary">
                    {partner.discount_rate}% Off
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use code: <span className="font-mono font-semibold">{partner.referral_code}</span>
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Verified Pros</h3>
              <p className="text-sm text-muted-foreground">
                Connect with background-checked, insured professionals
              </p>
            </Card>
            
            <Card className="p-6">
              <Zap className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Instant Booking</h3>
              <p className="text-sm text-muted-foreground">
                Book services in seconds, no phone calls required
              </p>
            </Card>
            
            <Card className="p-6">
              <TrendingUp className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Smart Management</h3>
              <p className="text-sm text-muted-foreground">
                Track all your home services in one place
              </p>
            </Card>
          </div>

          {/* Benefits List */}
          <Card className="p-8 mb-8">
            <h3 className="text-xl font-semibold mb-6 text-center">What You Get</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Free for homeowners forever',
                'Instant provider matching',
                'Automated scheduling & reminders',
                'Secure payment processing',
                'Real-time job tracking',
                'Professional communication',
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <div className="text-center space-y-4">
            <Button
              size="lg"
              onClick={() => navigate('/register?ref=' + searchParams.get('ref'))}
              className="text-lg px-8 py-6"
            >
              Get Started with {partner.discount_rate}% Off
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Your discount code will be automatically applied
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
