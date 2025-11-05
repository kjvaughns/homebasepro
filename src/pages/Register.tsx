import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Mail, Lock, User2, Phone, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createSafeErrorToast } from "@/utils/errorHandler";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<"homeowner" | "provider">("homeowner");
  const [referrerCode, setReferrerCode] = useState<string | null>(null);

  // Capture referral code from URL
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferrerCode(refParam);
      sessionStorage.setItem('homebase_referrer', refParam);
      console.log('Captured referral code:', refParam);
    } else {
      // Check if we have a stored code from previous page
      const stored = sessionStorage.getItem('homebase_referrer');
      if (stored) {
        setReferrerCode(stored);
      }
    }
  }, [searchParams]);

  const runAdminSignupFallback = async () => {
    console.log('[Registration] Fallback: Starting admin-signup');
    
    toast({
      title: "Using secure fallback...",
      description: "Creating your account safely.",
    });

    const referredBy = sessionStorage.getItem('homebase_referrer');
    
    const { data: adminData, error: adminError } = await supabase.functions.invoke('admin-signup', {
      body: {
        email: email.trim(),
        password,
        full_name: fullName,
        phone: phone || null,
        user_type: userType,
        referred_by: referredBy || undefined
      },
    });

    if (adminError) {
      console.error('[Registration] Fallback: admin-signup error:', adminError);
      throw adminError;
    }
    
    if (!adminData?.success) {
      console.error('[Registration] Fallback: admin-signup failed:', adminData?.error);
      throw new Error(adminData?.error || 'Failed to create account');
    }

    console.log('[Registration] Fallback: admin-signup succeeded, signing in');

    // Sign in the user immediately after admin creation
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      console.error('[Registration] Fallback: sign-in error:', signInError);
      throw signInError;
    }

    console.log('[Registration] Fallback: signed in successfully');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      if (!fullName || !email || !password) {
        throw new Error("Please fill in all required fields");
      }

      console.log('[Registration] Using admin-signup as primary path');

      // Always use backend admin-signup to create accounts reliably
      await runAdminSignupFallback();

      // Mark beta invite as accepted if it exists
      await supabase
        .from('beta_access')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('email', email.trim().toLowerCase())
        .eq('status', 'pending');

      toast({
        title: "Account created!",
        description: "Welcome to HomeBase.",
      });

      // Redirect to appropriate onboarding
      if (userType === "provider") {
        navigate("/onboarding/provider");
      } else {
        navigate("/onboarding/homeowner");
      }
    } catch (error: any) {
      console.error('[Registration] Final error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        toast({
          title: "Email already registered",
          description: "An account with this email already exists. Try signing in.",
          variant: "destructive",
        });
      } else {
        toast(createSafeErrorToast('Registration', error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Get started with HomeBase</CardDescription>
          {referrerCode && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 mt-2">
              <Gift className="h-4 w-4 text-primary" />
              <p className="text-sm text-primary font-medium">
                You were referred! Code: {referrerCode}
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-3">
              <Label>I am a...</Label>
              <RadioGroup value={userType} onValueChange={(value: any) => setUserType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="homeowner" id="homeowner" />
                  <Label htmlFor="homeowner" className="cursor-pointer font-normal">
                    Homeowner
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="provider" id="provider" />
                  <Label htmlFor="provider" className="cursor-pointer font-normal">
                    Service Provider
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

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
              <Label htmlFor="phone">Phone (optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  minLength={6}
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
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

export default Register;
