import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Image, Download } from 'lucide-react';
import { format } from 'date-fns';

export function ServiceHistory() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceHistory();
  }, []);

  const loadServiceHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Load completed bookings with linked invoices
      const { data: completedServices } = await supabase
        .from('bookings')
        .select(`
          *,
          organizations(name, logo_url),
          invoices(invoice_number, amount, pdf_url, paid_at)
        `)
        .eq('homeowner_profile_id', profile.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      setServices(completedServices || []);
    } catch (error) {
      console.error('Error loading service history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No completed services yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <Card key={service.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {service.organizations?.logo_url && (
                  <img 
                    src={service.organizations.logo_url} 
                    alt="" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <CardTitle className="text-base">{service.service_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {service.organizations?.name}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(service.date_time_start), 'PPP')}
              </span>
            </div>

            {/* Completion Notes */}
            {service.completion_notes && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Service Notes:</p>
                <p className="text-sm text-muted-foreground">
                  {service.completion_notes}
                </p>
              </div>
            )}

            {/* Completion Photos */}
            {service.completion_photos && service.completion_photos.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Proof of Work Photos
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {service.completion_photos.map((photoUrl: string, idx: number) => (
                    <img
                      key={idx}
                      src={photoUrl}
                      alt={`Completion photo ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                      onClick={() => window.open(photoUrl, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Invoice */}
            {service.invoices && service.invoices.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Invoice #{service.invoices[0].invoice_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${(service.invoices[0].amount / 100).toFixed(2)} • Paid {format(new Date(service.invoices[0].paid_at), 'PP')}
                    </p>
                  </div>
                </div>
                {service.invoices[0].pdf_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(service.invoices[0].pdf_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
