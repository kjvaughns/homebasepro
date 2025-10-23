import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Phone, Mail, User, Image as ImageIcon, FileText } from "lucide-react";
import { format } from "date-fns";

interface AppointmentDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  onReschedule?: () => void;
}

export function AppointmentDetailDrawer({ open, onOpenChange, appointment, onReschedule }: AppointmentDetailDrawerProps) {
  if (!appointment) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'confirmed': return 'secondary';
      case 'pending': return 'outline';
      case 'canceled': return 'destructive';
      default: return 'outline';
    }
  };

  const completionPhotos = appointment.completion_photos || [];
  const canReschedule = appointment.status === 'confirmed' || appointment.status === 'pending';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle className="text-xl">{appointment.organizations?.name}</DrawerTitle>
              <p className="text-sm text-muted-foreground mt-1">Appointment Details</p>
            </div>
            <Badge variant={getStatusColor(appointment.status)}>
              {appointment.status}
            </Badge>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(appointment.scheduled_at), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(appointment.scheduled_at), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Location</p>
              <p className="text-sm text-muted-foreground">
                {appointment.homes?.name || 'Property'}
              </p>
              <p className="text-sm text-muted-foreground">
                {appointment.homes?.address}, {appointment.homes?.city}, {appointment.homes?.state}
              </p>
            </div>
          </div>

          <Separator />

          {/* Service Details */}
          {appointment.service_type && (
            <>
              <div>
                <p className="font-medium mb-2">Service Type</p>
                <p className="text-sm text-muted-foreground">{appointment.service_type}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Technician */}
          {appointment.technician_name && (
            <>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Technician</p>
                  <p className="text-sm text-muted-foreground">{appointment.technician_name}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Technician Notes (during service) */}
          {appointment.technician_notes && (
            <>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Service Notes</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {appointment.technician_notes}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* What Happened (completion) */}
          {appointment.status === 'completed' && appointment.completion_notes && (
            <>
              <div>
                <p className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  What Happened
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{appointment.completion_notes}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Completion Photos */}
          {completionPhotos.length > 0 && (
            <>
              <div>
                <p className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Service Photos
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {completionPhotos.map((photo: string, idx: number) => (
                    <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={photo} 
                        alt={`Service photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Cancellation Info */}
          {appointment.status === 'canceled' && appointment.cancelation_reason && (
            <>
              <div className="bg-destructive/10 rounded-lg p-4">
                <p className="font-medium text-destructive mb-2">Cancellation Reason</p>
                <p className="text-sm">{appointment.cancelation_reason}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Provider Contact */}
          <div>
            <p className="font-medium mb-3">Contact Provider</p>
            <div className="flex flex-col gap-2">
              {appointment.organizations?.phone && (
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`tel:${appointment.organizations.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    {appointment.organizations.phone}
                  </a>
                </Button>
              )}
              {appointment.organizations?.email && (
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`mailto:${appointment.organizations.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    {appointment.organizations.email}
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Reschedule Button */}
          {canReschedule && onReschedule && (
            <>
              <Separator />
              <Button onClick={onReschedule} className="w-full">
                Reschedule Appointment
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
