import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InvoiceThankYou() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  const [loading, setLoading] = useState(true);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    checkAccountStatus();
  }, [invoiceId]);

  const checkAccountStatus = async () => {
    if (!invoiceId) {
      navigate("/");
      return;
    }

    try {
      // Get invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (
            id,
            name,
            email,
            user_id,
            homeowner_profile_id
          ),
          organizations (
            name
          )
        `)
        .eq("id", invoiceId)
        .single();

      if (invoiceError || !invoiceData) {
        console.error("Invoice fetch error:", invoiceError);
        navigate("/");
        return;
      }

      setInvoice(invoiceData);

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is logged in - link the invoice to their account
        await linkInvoiceToAccount(user.id, invoiceData);
      } else {
        // User needs to sign up
        setNeedsSignup(true);
        setFormData(prev => ({
          ...prev,
          fullName: invoiceData.clients?.name || ""
        }));
      }
    } catch (error) {
      console.error("Error checking account status:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const linkInvoiceToAccount = async (userId: string, invoiceData: any) => {
    try {
      // Get user's homeowner profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        toast.error("Profile not found");
        return;
      }

      // Link client record to user account
      await supabase
        .from("clients")
        .update({
          user_id: userId,
          homeowner_profile_id: profile.id
        })
        .eq("id", invoiceData.clients.id);

      toast.success("Payment successful! Your invoice has been linked to your account.");
      
      // Redirect to homeowner dashboard
      setTimeout(() => {
        navigate("/homeowner/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error linking invoice:", error);
      toast.error("Failed to link invoice to account");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!invoice?.clients?.email) {
      toast.error("Client email not found");
      return;
    }

    setLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invoice.clients.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            user_type: "homeowner"
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Link the invoice to the new account
        await linkInvoiceToAccount(authData.user.id, invoice);
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to create account");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!needsSignup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Your payment has been processed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Redirecting you to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Complete!</CardTitle>
          <CardDescription>
            Create a HomeBase account to track your services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Provider</span>
              <span className="text-sm font-medium">{invoice?.organizations?.name}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Amount Paid</span>
              <span className="text-sm font-medium">${(invoice?.amount / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{invoice?.clients?.email}</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account & Continue"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you'll be able to track all your service history with {invoice?.organizations?.name}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
