import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loginRateLimiter } from "@/utils/rateLimiter";
import { createSafeErrorToast } from "@/utils/errorHandler";
import { BiometricAuthButton } from "@/components/native/BiometricAuthButton";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if admin first - admins skip onboarding
        const { data: isAdmin } = await supabase.rpc('is_admin');
        
        if (isAdmin) {
          console.log('[Login] Admin user detected');
          
          // Auto-complete onboarding for admins if needed
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarded_at")
            .eq("user_id", user.id)
            .single();
            
          if (!profile?.onboarded_at) {
            console.log('[Login] Setting onboarded_at for admin');
            await supabase
              .from('profiles')
              .update({ onboarded_at: new Date().toISOString() })
              .eq('user_id', user.id);
          }
          
          navigate("/admin/dashboard");
          return;
        }
        
        // Regular user flow
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type, onboarded_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          if (!profile.onboarded_at) {
            // Not onboarded yet - send to appropriate onboarding
            if (profile.user_type === "provider") {
              navigate("/onboarding/provider");
            } else {
              navigate("/onboarding/homeowner");
            }
          } else if (profile.user_type === "provider") {
            navigate("/provider/dashboard");
          } else {
            navigate("/homeowner/dashboard");
          }
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!loginRateLimiter.canAttempt('login', 5, 900000)) {
      const minutes = loginRateLimiter.getResetMinutes('login', 900000);
      toast({
        title: 'Too many attempts',
        description: `Please wait ${minutes} minutes before trying again.`,
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Reset rate limiter on successful login
        loginRateLimiter.reset('login');
        
        // Check if admin first
        const { data: isAdmin } = await supabase.rpc('is_admin');
        
        if (isAdmin) {
          console.log("[Login] Admin user logged in");
          
          // Auto-complete onboarding for admins if needed
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('onboarded_at')
            .eq('user_id', data.user.id)
            .single();
            
          if (!adminProfile?.onboarded_at) {
            console.log("[Login] Setting onboarded_at for admin");
            await supabase
              .from('profiles')
              .update({ onboarded_at: new Date().toISOString() })
              .eq('user_id', data.user.id);
          }
          
          navigate("/admin/dashboard");
          return;
        }
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type, onboarded_at')
          .eq('user_id', data.user.id)
          .single();

        if (!profile?.onboarded_at) {
          console.log("[Login] User not onboarded, redirecting to setup");
          // User hasn't completed onboarding - send to setup
          if (profile?.user_type === "provider") {
            navigate("/onboarding/provider");
          } else {
            navigate("/onboarding/homeowner");
          }
        } else {
          console.log("[Login] User already onboarded, redirecting to dashboard");
          if (profile?.user_type === "provider") {
            navigate("/provider/dashboard");
          } else {
            navigate("/homeowner/dashboard");
          }
        }
      }
    } catch (error: any) {
      toast(createSafeErrorToast('Login', error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your HomeBase account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="my-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          <BiometricAuthButton
            onSuccess={async () => {
              if (email && password) {
                await handleLogin({ preventDefault: () => {} } as any);
              } else {
                toast({
                  title: "Enter credentials first",
                  description: "Please enter your email and password before using biometric authentication",
                  variant: "destructive"
                });
              }
            }}
          />

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
            <Button
              variant="link"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground"
            >
              Back to home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
