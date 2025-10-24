import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";

export default function BookProvider() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    service_id: "",
    time: "",
    notes: "",
  });

  useEffect(() => {
    loadProviderData();
  }, [slug]);

  const loadProviderData = async () => {
    try {
      // Get booking link
      const { data: bookingLink, error: linkError } = await supabase
        .from('provider_booking_links')
        .select('*, organizations(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (linkError || !bookingLink) {
        toast.error("Booking link not found");
        return;
      }

      setProvider(bookingLink.organizations);

      // Get provider's services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', bookingLink.organization_id)
        .eq('is_active', true);

      setServices(servicesData || []);
    } catch (error) {
      console.error("Error loading provider:", error);
      toast.error("Failed to load provider information");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!selectedDate || !formData.time) {
        toast.error("Please select a date and time");
        return;
      }

      const selectedService = services.find(s => s.id === formData.service_id);
      if (!selectedService) {
        toast.error("Please select a service");
        return;
      }

      // Combine date and time
      const [hours, minutes] = formData.time.split(':');
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + (selectedService.estimated_duration_minutes || 60));

      // Create booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          provider_org_id: provider.id,
          homeowner_profile_id: '00000000-0000-0000-0000-000000000000', // Placeholder - will be linked when they sign up
          service_name: selectedService.name,
          address: formData.address,
          date_time_start: startDateTime.toISOString(),
          date_time_end: endDateTime.toISOString(),
          status: 'pending',
          notes: `Customer: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\nNotes: ${formData.notes}`,
          estimated_price_low: selectedService.default_price,
          estimated_price_high: selectedService.default_price,
        });

      if (bookingError) throw bookingError;

      toast.success("Booking request submitted! The provider will contact you shortly.");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        service_id: "",
        time: "",
        notes: "",
      });
      setSelectedDate(undefined);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error("Failed to submit booking: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Provider not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        {/* Provider Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              {provider.logo_url && (
                <img src={provider.logo_url} alt={provider.name} className="h-16 w-16 rounded-full object-cover" />
              )}
              <div>
                <CardTitle className="text-2xl">{provider.name}</CardTitle>
                {provider.description && (
                  <p className="text-muted-foreground mt-1">{provider.description}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Booking Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Service & Date */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Select Service & Date
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Service</Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      value={formData.service_id}
                      onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                      required
                    >
                      <option value="">Select a service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - ${(service.default_price / 100).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border mt-1"
                    />
                  </div>

                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Service Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main St, City, State"
                      required
                    />
                  </div>

                  <div>
                    <Label>Additional Notes (Optional)</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any special requests or details..."
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      "Request Booking"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
