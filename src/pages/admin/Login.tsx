import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, Mail, Lock, Phone, User2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Modes for the admin login flow
// email -> ask email only
// signin -> email + password (staff already exists)
// signup -> invited email, collect name/phone/password and create account

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
    // If already logged in and has role, redirect to dashboard
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

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      if (!normalized) throw new Error("Please enter a valid email");

      // 1) If staff exists, go to signin
      const { data: staff } = await supabase
        .from("staff")
        .select("id, full_name, phone")
        .eq("email", normalized)
        .maybeSingle();

      if (staff) {
        setMode("signin");
        toast({ title: "Welcome", description: "Enter your password to sign in." });
        return;
      }

      // 2) If invite exists and pending, go to signup
      const { data: invite } = await supabase
        .from("staff_invites")
        .select("full_name, phone, role, status")
        .eq("email", normalized)
        .maybeSingle();

      if (invite && invite.status === "pending") {
        setFullName(invite.full_name || "");
        setPhone(invite.phone || "");
        setInviteRole(invite.role);
        setBootstrap(false);
        setMode("signup");
        toast({ title: "You're invited!", description: "Create your admin password." });
        return;
      }

      // 3) Bootstrap: if no admin exists, allow this email to set up the first admin
      const { data: adminExistsData, error: adminExistsError } = await supabase.rpc("admin_exists");
      if (adminExistsError) throw adminExistsError;

      if (adminExistsData === false) {
        setInviteRole("admin");
        setBootstrap(true);
        setMode("signup");
        toast({ title: "Set up admin", description: "Create the initial owner admin account." });
        return;
      }

      toast({
        title: "No access",
        description: "This email is not invited to the admin portal.",
        variant: "destructive",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // confirm role
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
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/admin/dashboard`;

      // Create account (works for both bootstrap and invited flows)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId) throw new Error("Signup failed");

      if (bootstrap) {
        // Bootstrap path: assign admin role directly (policy allows only when no admins exist)
        const { error: roleError } = await supabase.from("user_roles").insert([
          { user_id: userId, role: "admin" as any },
        ]);
        if (roleError) throw roleError;

        toast({ title: "Owner admin created", description: "Welcome to the admin portal!" });
        navigate("/admin/dashboard");
        return;
      }

      if (!inviteRole) throw new Error("Invite role missing");

      // Invited flow: create staff record and assign invited role, then mark invite accepted
      const { error: staffError } = await supabase.from("staff").insert([
        {
          user_id: userId,
          email: email.toLowerCase(),
          full_name: fullName,
          phone,
        },
      ]);
      if (staffError) throw staffError;

      const { error: roleError } = await supabase.from("user_roles").insert([
        { user_id: userId, role: inviteRole as any },
      ]);
      if (roleError) throw roleError;

      const { error: inviteError } = await supabase
        .from("staff_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("email", email.toLowerCase());
      if (inviteError) throw inviteError;

      toast({ title: "Account created", description: "Welcome to the admin portal!" });
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
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
            <form onSubmit={handleCheckEmail} className="space-y-4">
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
            <form onSubmit={handleSignin} className="space-y-4">
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
                  <>Sign In</>
                )}
              </Button>
              <Button variant="link" onClick={() => setMode("email")} className="w-full">
                Use a different email
              </Button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
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
              <Button variant="link" onClick={() => setMode("email")} className="w-full">
                Use a different email
              </Button>
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
