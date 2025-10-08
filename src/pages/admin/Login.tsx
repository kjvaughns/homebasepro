import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, Mail, Lock, Phone, User2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "email" | "signin" | "signup";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("email");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteRole, setInviteRole] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"]) 
        .maybeSingle();
      if (roleRow) navigate("/admin/dashboard");
    };
    init();
  }, [navigate]);

  const handleCheckEmail = async () => {
    try {
      setLoading(true);
      const normalized = email.trim().toLowerCase();
      if (!normalized) throw new Error("Please enter a valid email");

      // 1) Prefer existing admin/moderator accounts over invites
      const { data: existingUserId, error: existingUserErr } = await supabase.rpc("get_user_id_by_email", { user_email: normalized });
      if (existingUserErr) {
        console.warn("User existence check failed:", existingUserErr);
      }

      if (existingUserId) {
        const [
          { data: isAdmin, error: adminErr },
          { data: isMod, error: modErr }
        ] = await Promise.all([
          supabase.rpc("has_role", { _user_id: existingUserId, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: existingUserId, _role: "moderator" }),
        ]);
        if (adminErr) console.warn("has_role(admin) error:", adminErr);
        if (modErr) console.warn("has_role(moderator) error:", modErr);

        if (isAdmin || isMod) {
          // Known admin/mod - go straight to password entry
          setInviteRole(null);
          setBootstrap(false);
          setMode("signin");
          toast({ title: "Welcome back", description: "Enter your password to sign in." });
          return;
        }
      }

      // 2) If not an existing admin/mod, check for a pending invite for this email
      const { data: inviteData, error: inviteErr } = await supabase.rpc("check_admin_invite", { invite_email: normalized });
      if (inviteErr) throw inviteErr;
      const invite = Array.isArray(inviteData) && inviteData.length > 0 ? inviteData[0] : null;

      if (invite) {
        setFullName(invite.full_name || "");
        setPhone(invite.phone || "");
        setInviteRole(invite.role || "moderator");
        setBootstrap(false);

        const userExists = !!existingUserId;
        if (userExists) {
          setMode("signin");
          toast({ title: "Welcome back", description: "Sign in to accept your admin invite." });
        } else {
          setMode("signup");
          toast({ title: "Welcome", description: "Complete your registration to join the team." });
        }
        return;
      }

      // 3) Bootstrap: if no admins exist at all, allow this email to become the first admin
      const { data: adminExistsData, error: adminExistsError } = await supabase.rpc("admin_exists");
      if (adminExistsError) throw adminExistsError;

      if (adminExistsData === false) {
        setInviteRole("admin");
        setBootstrap(true);
        setMode("signin");
        toast({ 
          title: "Bootstrap admin", 
          description: "Sign in or create an account to become the admin." 
        });
        return;
      }

      // 4) Final guard: email isn't recognized for admin access
      throw new Error("Email not recognized for admin access. Please contact an administrator.");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async () => {
    try {
      setLoading(true);
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // If bootstrap mode (no admins exist), assign admin role
      if (bootstrap) {
        const { error: roleError } = await supabase.from("user_roles").insert([
          { user_id: authData.user!.id, role: "admin" as any },
        ]);
        if (roleError) throw roleError;
        
        toast({ title: "Success", description: "You are now the admin!" });
        navigate("/admin/dashboard");
        return;
      }

      // If signing in with a pending invite, assign role and accept invite
      if (inviteRole) {
        const { error: roleError } = await supabase.from("user_roles").insert([
          { user_id: authData.user!.id, role: inviteRole as any },
        ]);
        if (roleError && !roleError.message.includes("duplicate")) throw roleError;
        
        // Mark invite as accepted using secure RPC function
        const { error: inviteErr } = await supabase.rpc("accept_admin_invite", { 
          invite_email: email.toLowerCase().trim() 
        });
        if (inviteErr) throw inviteErr;

        toast({ title: "Success", description: "Your admin access has been activated!" });
        navigate("/admin/dashboard");
        return;
      }

      // confirm role for normal signin
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user!.id)
        .in("role", ["admin", "moderator"]) 
        .maybeSingle();
      if (!roleRow) {
        await supabase.auth.signOut();
        throw new Error("You do not have admin access");
      }

      navigate("/admin/dashboard");
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    try {
      setLoading(true);
      if (!email || !password || !fullName) throw new Error("All fields are required");

      // 1) sign up new user
      const { data: authData, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            phone: phone || null,
          },
        },
      });
      if (error) throw error;

      // 2) insert user role
      const { error: roleErr } = await supabase.from("user_roles").insert([
        { user_id: authData.user!.id, role: inviteRole as any },
      ]);
      if (roleErr) throw roleErr;

      // 3) mark invite as accepted (if not bootstrap)
      if (!bootstrap) {
        const { error: inviteErr } = await supabase.rpc("accept_admin_invite", { 
          invite_email: email.toLowerCase().trim() 
        });
        if (inviteErr) throw inviteErr;
      }

      toast({ title: "Success", description: "Your account has been created!" });
      navigate("/admin/dashboard");
    } catch (error: any) {
      const msg = (error?.message ?? '').toLowerCase();
      if (msg.includes('registered') || msg.includes('already')) {
        setMode('signin');
        toast({ title: 'Account exists', description: 'Please sign in to accept your invite.' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Admin Portal</CardTitle>
          <CardDescription>
            {mode === "email" && "Enter your admin email to continue"}
            {mode === "signin" && "Enter your password to sign in"}
            {mode === "signup" && "You're invited! Create your admin account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "email" && (
            <form onSubmit={(e) => { e.preventDefault(); handleCheckEmail(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
                  </>
                ) : (
                  <>Continue</>
                )}
              </Button>
            </form>
          )}

          {mode === "signin" && (
            <form onSubmit={(e) => { e.preventDefault(); handleSignin(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} disabled />
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
                  <>Sign In{bootstrap ? " & Bootstrap Admin" : ""}</>
                )}
              </Button>
              <Button variant="link" onClick={() => setMode("email")} className="w-full" type="button">
                Use a different email
              </Button>
              {bootstrap && (
                <Button 
                  variant="outline" 
                  onClick={() => setMode("signup")} 
                  className="w-full"
                  type="button"
                >
                  Don't have an account? Sign up
                </Button>
              )}
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>Create Admin Account</>
                )}
              </Button>
              <div className="flex flex-col gap-2">
                <Button variant="link" onClick={() => setMode("email")} className="w-full" type="button">
                  Use a different email
                </Button>
                <Button variant="outline" onClick={() => setMode("signin")} className="w-full" type="button">
                  Already have an account? Sign in
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground"
            >
              Back to main site
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
