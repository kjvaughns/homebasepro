import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  Users, 
  MousePointerClick, 
  TrendingUp,
  Copy,
  ExternalLink,
  QrCode,
} from "lucide-react";
import QRCode from "qrcode";

interface PartnerStats {
  clicks_24h: number;
  clicks_7d: number;
  clicks_30d: number;
  total_referrals: number;
  active_customers: number;
  mrr_cents: number;
  commission_mtd_cents: number;
  commission_all_time_cents: number;
  next_payout_date: string | null;
}

export default function PartnersDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const referralLink = partner 
    ? `${window.location.origin}/join?ref=${partner.referral_slug}`
    : "";

  useEffect(() => {
    loadPartnerData();
  }, []);

  useEffect(() => {
    if (referralLink) {
      QRCode.toDataURL(referralLink, { width: 200 }).then(setQrCodeUrl);
    }
  }, [referralLink]);

  const loadPartnerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/partners/login");
        return;
      }

      const { data: partnerData, error: partnerError } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (partnerError || !partnerData) {
        toast({
          title: "Not a partner",
          description: "You don't have a partner account.",
          variant: "destructive",
        });
        navigate("/partners");
        return;
      }

      if (partnerData.status !== "ACTIVE") {
        toast({
          title: "Account pending",
          description: "Your partner account is pending approval.",
        });
        navigate("/partners?status=pending");
        return;
      }

      setPartner(partnerData);

      // Load stats
      await loadStats(partnerData.id);
    } catch (error) {
      console.error("Error loading partner data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (partnerId: string) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch clicks
    const { count: clicks24h } = await supabase
      .from("partner_clicks")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .gte("created_at", oneDayAgo.toISOString());

    const { count: clicks7d } = await supabase
      .from("partner_clicks")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .gte("created_at", sevenDaysAgo.toISOString());

    const { count: clicks30d } = await supabase
      .from("partner_clicks")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Fetch referrals
    const { count: totalReferrals } = await supabase
      .from("partner_referrals")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", partnerId);

    const { count: activeCustomers } = await supabase
      .from("partner_referrals")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .eq("activated", true);

    // Fetch commissions
    const { data: commissionsMtd } = await supabase
      .from("partner_commissions")
      .select("commission_amount_cents")
      .eq("partner_id", partnerId)
      .eq("status", "PENDING")
      .gte("created_at", monthStart.toISOString());

    const { data: commissionsAllTime } = await supabase
      .from("partner_commissions")
      .select("commission_amount_cents")
      .eq("partner_id", partnerId);

    const commissionMtd = commissionsMtd?.reduce((sum, c) => sum + c.commission_amount_cents, 0) || 0;
    const commissionAllTime = commissionsAllTime?.reduce((sum, c) => sum + c.commission_amount_cents, 0) || 0;

    setStats({
      clicks_24h: clicks24h || 0,
      clicks_7d: clicks7d || 0,
      clicks_30d: clicks30d || 0,
      total_referrals: totalReferrals || 0,
      active_customers: activeCustomers || 0,
      mrr_cents: 0, // TODO: Calculate from active subscriptions
      commission_mtd_cents: commissionMtd,
      commission_all_time_cents: commissionAllTime,
      next_payout_date: null, // TODO: Calculate next payout date
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} copied!`,
      description: "You can now paste it anywhere",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!partner || !stats) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Partner Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {partner.business_name || "Partner"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/partners/payouts")}>
                Payouts
              </Button>
              <Button variant="outline" onClick={() => navigate("/partners/resources")}>
                Resources
              </Button>
              <Button variant="outline" onClick={() => navigate("/partners/settings")}>
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Clicks (30d)</span>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{stats.clicks_30d}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 7d: {stats.clicks_7d} | 24h: {stats.clicks_24h}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Active Customers</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{stats.active_customers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total signups: {stats.total_referrals}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Commission (MTD)</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              ${(stats.commission_mtd_cents / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time: ${(stats.commission_all_time_cents / 100).toFixed(2)}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Commission Rate</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{partner.commission_rate_bp / 100}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Discount: {partner.discount_rate_bp / 100}% off
            </p>
          </Card>
        </div>

        {/* Links & Codes */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Your Links & Codes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Referral Link</label>
                <div className="flex gap-2 mt-2">
                  <Input value={referralLink} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(referralLink, "Referral link")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Promo Code</label>
                <div className="flex gap-2 mt-2">
                  <Input value={partner.referral_code} readOnly className="font-mono text-lg font-bold" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(partner.referral_code, "Promo code")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {partner.discount_rate_bp / 100}% off for your referrals
                </p>
              </div>

              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(referralLink, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Your Link
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border rounded-lg p-6">
              {qrCodeUrl && (
                <>
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mb-4" />
                  <p className="text-sm text-muted-foreground text-center">
                    Scan to visit your referral link
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = qrCodeUrl;
                      link.download = `homebase-partner-qr-${partner.referral_code}.png`;
                      link.click();
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Stripe Connect Status */}
        {partner.stripe_account_id && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Payout Settings</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Stripe Connect</p>
                <p className="text-sm text-muted-foreground">
                  Your payout account is connected
                </p>
              </div>
              <Button variant="outline">Update Payout Details</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

