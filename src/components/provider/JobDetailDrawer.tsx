import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Mail, Phone, MapPin, Calendar, Clock, DollarSign, Navigation, FileText, Stethoscope } from "lucide-react";
import { QuoteBuilder } from "./QuoteBuilder";
import { DiagnosisForm } from "./DiagnosisForm";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobDetailDrawerProps {
  job: any;
  open: boolean;
  onClose: () => void;
  events?: any[];
  reviews?: any[];
  onRequestReview?: () => void;
}

export const JobDetailDrawer = ({ job, open, onClose, events, reviews, onRequestReview }: JobDetailDrawerProps) => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (job && open) {
      loadQuotes();
    }
  }, [job, open]);

  const loadQuotes = async () => {
    if (!job?.id) return;
    
    setLoadingQuotes(true);
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("service_request_id", job.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setQuotes(data);
      }
    } catch (error) {
      console.error("Error loading quotes:", error);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: newStatus })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Status updated successfully');
      onClose(); // Close drawer to trigger parent refresh
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!job) return null;
  
  const statusConfig: Record<string, string> = {
    lead: "bg-muted text-muted-foreground",
    service_call: "bg-primary/10 text-primary",
    quoted: "bg-accent text-accent-foreground",
    scheduled: "bg-primary/20 text-primary",
    in_progress: "bg-secondary text-secondary-foreground",
    completed: "bg-primary/10 text-primary",
    invoiced: "bg-accent text-accent-foreground",
    paid: "bg-primary text-primary-foreground",
    cancelled: "bg-destructive/10 text-destructive"
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="space-y-2">
            <SheetTitle className="text-left text-2xl">{job.service_name}</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge className={statusConfig[job.status]}>{job.status.replace('_', ' ')}</Badge>
              <Select
                value={job.status}
                onValueChange={handleStatusChange}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="service_call">Service Call</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quotes">
              <FileText className="h-4 w-4 mr-1" />
              Quotes
            </TabsTrigger>
            {job.is_service_call && (
              <TabsTrigger value="diagnostic">
                <Stethoscope className="h-4 w-4 mr-1" />
                Diagnostic
              </TabsTrigger>
            )}
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Location */}
            {job.address && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Location</h3>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <p className="text-sm">{job.address}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const encoded = encodeURIComponent(job.address);
                      window.open(`maps://?daddr=${encoded}`, '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Apple Maps
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const encoded = encodeURIComponent(job.address);
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Google Maps
                  </Button>
                </div>
              </div>
            )}

            {/* Schedule */}
            {job.window_start && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Schedule</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{format(new Date(job.window_start), 'PPPP')}</p>
                  </div>
                  {job.window_end && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {format(new Date(job.window_start), 'h:mm a')} - {format(new Date(job.window_end), 'h:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing */}
            {(job.quote_low || job.deposit_due || job.total_due) && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Pricing</h3>
                <div className="space-y-1">
                  {job.is_service_call && job.deposit_due && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Diagnostic Fee</span>
                      <span className="font-medium">${job.deposit_due}</span>
                      {job.deposit_paid && (
                        <Badge variant="outline" className="ml-2">Paid</Badge>
                      )}
                    </div>
                  )}
                  {job.quote_low && job.quote_high && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quote Range</span>
                      <span className="font-medium">${job.quote_low} - ${job.quote_high}</span>
                    </div>
                  )}
                  {job.total_due && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm font-semibold">Total Due</span>
                      <span className="font-bold text-lg">${job.total_due}</span>
                    </div>
                  )}
                  {job.total_paid > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-sm">Paid</span>
                      <span className="font-medium">${job.total_paid}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Client Info */}
            {job.clients && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Client</h3>
                <div className="space-y-2">
                  <p className="font-semibold">{job.clients.name}</p>
                  {job.clients.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${job.clients.email}`} className="text-primary hover:underline">
                        {job.clients.email}
                      </a>
                    </div>
                  )}
                  {job.clients.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${job.clients.phone}`} className="text-primary hover:underline">
                        {job.clients.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Notes */}
            {job.pre_job_notes && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Pre-Job Notes</h3>
                <p className="text-sm bg-muted p-3 rounded-lg">{job.pre_job_notes}</p>
              </div>
            )}
            
            {job.post_job_notes && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Post-Job Notes</h3>
                <p className="text-sm bg-muted p-3 rounded-lg">{job.post_job_notes}</p>
              </div>
            )}
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="space-y-4">
            {loadingQuotes ? (
              <div className="text-center py-8 text-muted-foreground">Loading quotes...</div>
            ) : quotes.length > 0 ? (
              <div className="space-y-3 mb-4">
                {quotes.map((quote) => (
                  <div key={quote.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{quote.service_name}</div>
                      <Badge variant={
                        quote.status === 'accepted' ? 'default' :
                        quote.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {quote.status}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      ${(quote.total_amount / 100).toFixed(2)}
                    </div>
                    {quote.description && (
                      <p className="text-sm text-muted-foreground">{quote.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            
            <div className="py-4">
              <QuoteBuilder
                serviceRequestId={job.id}
                homeownerId={job.homeowner_id || ""}
                homeId={job.home_id || ""}
                onSuccess={() => {
                  loadQuotes();
                }}
              />
            </div>
          </TabsContent>

          {/* Diagnostic Tab */}
          {job.is_service_call && (
            <TabsContent value="diagnostic" className="space-y-4">
              <DiagnosisForm
                serviceCallId={job.service_call_id}
                onSuccess={() => {
                  loadQuotes();
                  onClose();
                }}
              />
            </TabsContent>
          )}

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            {events && events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event: any) => (
                  <div key={event.id} className="border-l-2 border-primary pl-4 pb-4">
                    <p className="font-medium text-sm capitalize">
                      {event.event_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(event.created_at), 'PPp')}
                    </p>
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <div className="mt-2 text-xs bg-muted p-2 rounded">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No activity recorded yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};