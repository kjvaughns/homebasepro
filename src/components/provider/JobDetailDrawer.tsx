import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Mail, Phone, MapPin, Calendar, Clock, DollarSign, Navigation } from "lucide-react";

interface JobDetailDrawerProps {
  job: any;
  open: boolean;
  onClose: () => void;
  events?: any[];
  reviews?: any[];
  onRequestReview?: () => void;
}

export const JobDetailDrawer = ({ job, open, onClose, events, reviews, onRequestReview }: JobDetailDrawerProps) => {
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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="space-y-2">
            <SheetTitle className="text-2xl">{job.service_name}</SheetTitle>
            <Badge className={statusConfig[job.status]}>{job.status.replace('_', ' ')}</Badge>
          </div>
        </SheetHeader>
        
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="client">Client</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
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
          
          <TabsContent value="client" className="mt-4">
            {job.clients ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{job.clients.name}</p>
                  </div>
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
                <Button variant="outline" size="sm" className="w-full">
                  View Full Client History
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No client linked to this job</p>
              </div>
            )}
          </TabsContent>
          
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
          
          <TabsContent value="reviews" className="mt-4 space-y-4">
            {reviews && reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{review.reviewer_name || "Anonymous"}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-yellow-500">
                              {i < review.rating ? "★" : "☆"}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">No reviews yet</p>
                {job.status === 'completed' && onRequestReview && (
                  <Button onClick={onRequestReview} size="sm">
                    Request Review
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="media" className="mt-4">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Media uploads coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
