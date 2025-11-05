import { useState, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CreditCard } from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';

const PaymentCheckout = lazy(() => import('./PaymentCheckout').then(m => ({ default: m.PaymentCheckout })));

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: any;
  service?: any;
}

export function BookingDialog({ open, onOpenChange, provider, service }: BookingDialogProps) {
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    service_name: service?.name || '',
    description: '',
    address: '',
    date: new Date(),
    time: '09:00',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Check provider availability and create booking atomically
      const startTime = new Date(`${formData.date.toDateString()} ${formData.time}`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Add 1 hour

      const { data: result, error: bookingError } = await supabase.rpc('check_and_create_booking', {
        p_provider_org_id: provider.id,
        p_homeowner_profile_id: profile?.id,
        p_service_name: formData.service_name,
        p_address: formData.address,
        p_date_time_start: startTime.toISOString(),
        p_date_time_end: endTime.toISOString(),
        p_notes: formData.description,
        p_home_id: null
      }) as { data: any; error: any };

      if (bookingError) throw bookingError;

      if (!result?.success) {
        toast({
          title: 'Time slot unavailable',
          description: result?.error || 'This time slot is already booked. Please choose a different time.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Fetch the created booking
      const { data: newBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', result.booking_id)
        .single();

      if (fetchError) throw fetchError;

      setBooking(newBooking);
      setStep('payment');
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: 'Appointment failed',
        description: error.message || 'Failed to create appointment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    toast({
      title: 'Payment successful',
      description: 'Your appointment is confirmed!',
    });

    // Update booking status
    if (booking) {
      await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          deposit_paid: true,
        })
        .eq('id', booking.id);
    }

    onOpenChange(false);
    setStep('details');
    setBooking(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setStep('details');
    setBooking(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'details' ? (
          <>
            <DialogHeader>
              <DialogTitle>Book {provider.name}</DialogTitle>
              <DialogDescription>
                Fill in the details for your service appointment
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="service_name">Service *</Label>
                <Input
                  id="service_name"
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  placeholder="e.g., Lawn Mowing, HVAC Repair"
                  required
                />
              </div>

              <div className="space-y-2">
                <AddressAutocomplete
                  label="Service Address"
                  placeholder="Start typing your address..."
                  defaultValue={formData.address}
                  onAddressSelect={(address) => setFormData({ ...formData, address: address.fullAddress })}
                  onManualChange={(street) => setFormData({ ...formData, address: street })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Date *</Label>
                  <div className="w-full overflow-x-auto">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData({ ...formData, date })}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border max-w-full mx-auto"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Preferred Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Provider will confirm availability
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Additional Details</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any specific requirements or notes..."
                  rows={3}
                />
              </div>

              {service?.price && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Service Price</span>
                    <span className="font-semibold">${service.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Deposit Required (25%)</span>
                    <span className="font-semibold">${(service.price * 0.25).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Remaining balance due after service completion
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Continue to Payment
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Pay deposit to confirm your booking with {provider.name}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                <PaymentCheckout
                  jobId={booking?.id}
                  providerId={provider.id}
                  amount={(booking?.deposit_amount || 5000) / 100}
                  description={`Deposit for ${formData.service_name}`}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handleCancel}
                />
              </Suspense>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
