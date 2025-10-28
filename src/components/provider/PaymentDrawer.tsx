import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, Send, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { RefundDialog } from "./RefundDialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PaymentDrawerProps {
  payment: any;
  onClose: () => void;
  onRefresh: () => void;
}

export function PaymentDrawer({ payment, onClose, onRefresh }: PaymentDrawerProps) {
  const { toast } = useToast();
  const [showRefund, setShowRefund] = useState(false);
  const [relatedJob, setRelatedJob] = useState<any>(null);
  const [relatedInvoice, setRelatedInvoice] = useState<any>(null);
  const [relatedClient, setRelatedClient] = useState<any>(null);

  useEffect(() => {
    loadRelatedData();
  }, [payment]);

  const loadRelatedData = async () => {
    if (payment.job_id) {
      const { data: job } = await supabase
        .from("bookings")
        .select(`
          *,
          service:services(name),
          parts:job_parts(*, part:parts_materials(*))
        `)
        .eq("id", payment.job_id)
        .maybeSingle();
      setRelatedJob(job);
    }
    
    if (payment.invoice_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", payment.invoice_id)
        .maybeSingle();
      setRelatedInvoice(invoice);
    }
    
    if (payment.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", payment.client_id)
        .maybeSingle();
      setRelatedClient(client);
    }
  };

  const copyLink = () => {
    if (payment.url) {
      navigator.clipboard.writeText(payment.url);
      toast({
        title: "Link copied",
        description: "Payment link copied to clipboard",
      });
    }
  };

  const openLink = () => {
    if (payment.url) {
      window.open(payment.url, '_blank');
    }
  };

  return (
    <>
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Payment Details</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Status & Amount */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">
                  ${((payment.amount || 0) / 100).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {payment.type?.replace('_', ' ')}
                </p>
              </div>
              <Badge
                variant={
                  payment.status === "paid" || payment.status === "completed"
                    ? "default"
                    : payment.status === "open" || payment.status === "pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {payment.status}
              </Badge>
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-3">
              <DetailRow label="Client" value={payment.meta?.client_name || "—"} />
              <DetailRow label="Created" value={new Date(payment.created_at).toLocaleString()} />
              {payment.meta?.description && (
                <DetailRow label="Description" value={payment.meta.description} />
              )}
              <DetailRow label="Currency" value={payment.currency?.toUpperCase() || "USD"} />
              {payment.stripe_id && (
                <DetailRow label="Stripe ID" value={payment.stripe_id} mono />
              )}
            </div>

            <Separator />

            {/* Related Job */}
            {relatedJob && (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Related Job</h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="font-medium">{relatedJob.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {relatedJob.date_time_start && format(new Date(relatedJob.date_time_start), 'MMM d, yyyy')}
                    </p>
                    {relatedJob.service && (
                      <Badge variant="outline">{relatedJob.service.name}</Badge>
                    )}
                    {relatedJob.parts && relatedJob.parts.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Parts: {relatedJob.parts.map((p: any) => p.part?.name).filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Related Client */}
            {relatedClient && (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Client</h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="font-medium">{relatedClient.name}</p>
                    <p className="text-sm text-muted-foreground">{relatedClient.email}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>LTV: ${relatedClient.lifetime_value || 0}</span>
                      <span>•</span>
                      <span>Jobs: {relatedClient.total_jobs || 0}</span>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Actions</h4>

              {payment.url && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={copyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={openLink}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
              )}

              {payment.status === "open" && (
                <Button variant="outline" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Resend Notification
                </Button>
              )}

              {(payment.status === "paid" || payment.status === "completed") && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRefund(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refund Payment
                </Button>
              )}

              {payment.status === "open" && (
                <Button variant="outline" className="w-full">
                  Mark as Paid
                </Button>
              )}

              {payment.stripe_id && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() =>
                    window.open(
                      `https://dashboard.stripe.com/payments/${payment.stripe_id}`,
                      "_blank"
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Stripe
                </Button>
              )}
            </div>

            {/* Timeline */}
            {payment.meta?.timeline && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Timeline</h4>
                  {payment.meta.timeline.map((event: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <div className="flex-1">
                        <p className="font-medium">{event.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <RefundDialog
        payment={payment}
        open={showRefund}
        onOpenChange={setShowRefund}
        onSuccess={() => {
          setShowRefund(false);
          onRefresh();
          onClose();
        }}
      />
    </>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}