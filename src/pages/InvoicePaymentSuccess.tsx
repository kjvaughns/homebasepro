import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoicePaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  const invoiceId = searchParams.get('invoice_id');
  const clientEmail = searchParams.get('client_email');

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      if (!invoiceId || !clientEmail) {
        toast.error('Invalid payment confirmation link');
        navigate('/');
        return;
      }

      // Fetch invoice details
      const { data: invoice } = await supabase
        .from('invoices')
        .select(`
          *,
          organizations(name, logo_url),
          bookings(completion_notes, completion_photos)
        `)
        .eq('id', invoiceId)
        .single();

      setInvoiceData(invoice);

      // Check if user exists with this email
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Already logged in - link invoice and redirect
        await linkInvoiceToAccount(session.user.id);
        return;
      }

      // Not logged in - show signup
      setNeedsSignup(true);
    } catch (error) {
      console.error('Error checking account:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const linkInvoiceToAccount = async (userId: string) => {
    try {
      // Get or create profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        toast.error('Profile not found');
        return;
      }

      // Update client record with user_id
      const { data: client } = await supabase
        .from('clients')
        .select('id, organization_id')
        .eq('email', clientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (client) {
        await supabase
          .from('clients')
          .update({
            user_id: userId,
            homeowner_profile_id: profile.id
          })
          .eq('id', client.id);
      }

      toast.success('Payment confirmed! Welcome to HomeBase');
      navigate('/homeowner/dashboard');
    } catch (error) {
      console.error('Error linking invoice:', error);
      toast.error('Failed to link account');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email: clientEmail!,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Link invoice immediately
        await linkInvoiceToAccount(data.user.id);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Processing payment...</p>
        </div>
      </div>
    );
  }

  if (!needsSignup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Your payment has been processed. Redirecting you to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle>Payment Complete!</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Create your HomeBase account to track this service and book future appointments
          </p>
        </CardHeader>
        <CardContent>
          {invoiceData && (
            <div className="mb-6 p-4 bg-primary/5 rounded-lg">
              <p className="text-sm font-medium mb-1">Service from:</p>
              <p className="text-lg font-semibold">{invoiceData.organizations?.name}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Invoice #{invoiceData.invoice_number}
              </p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={clientEmail || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{' '}
              <a href="/auth" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
