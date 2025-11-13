import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function PartnersLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is a partner
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: partner } = await supabase
        .from("partners")
        .select("id, status")
        .eq("user_id", user.id)
        .single();

      if (!partner) {
        toast({
          title: "Not a partner",
          description: "This account is not registered as a partner.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      if (partner.status === "PENDING") {
        toast({
          title: "Application pending",
          description: "Your partner application is still under review.",
        });
        navigate("/partners?status=pending");
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Redirecting to your dashboard...",
      });

      navigate("/partners/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/partners")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Partners
        </Button>

        <Card className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Partner Login</h1>
            <p className="text-muted-foreground">
              Sign in to access your partner dashboard
            </p>
          </div>

          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong>First time logging in?</strong> Use the temporary password from your approval email. 
              You'll be able to change it after logging in.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center mt-4">
              <Button 
                variant="link" 
                className="text-sm text-muted-foreground p-0 h-auto"
                onClick={() => {
                  // TODO: Implement forgot password
                  alert('Please contact support at partners@homebaseproapp.com to reset your password.');
                }}
              >
                Forgot password?
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate("/partners/apply")}
            >
              Apply to become a partner
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
