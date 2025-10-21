import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function RefundRequests() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingNotes, setProcessingNotes] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["refund-requests"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) throw new Error("Organization not found");

      const { data, error } = await supabase
        .from("refund_requests")
        .select(`
          *,
          bookings (
            id,
            service_type,
            date_time_start
          ),
          profiles!refund_requests_homeowner_profile_id_fkey (
            full_name,
            email
          )
        `)
        .eq("provider_org_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const processRefund = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: "approve" | "deny" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newStatus = action === "approve" ? "approved" : "denied";

      const { error } = await supabase
        .from("refund_requests")
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          notes: processingNotes || null,
        })
        .eq("id", requestId);

      if (error) throw error;

      // If approved, call payments-api to process actual refund
      if (action === "approve") {
        const request = requests?.find((r) => r.id === requestId);
        if (request) {
          const { error: refundError } = await supabase.functions.invoke("payments-api", {
            body: {
              action: "refund",
              paymentId: request.booking_id, // This should be payment ID, needs adjustment
              amount: request.amount_requested,
              reason: "approved_refund_request",
            },
          });

          if (refundError) {
            console.error("Refund processing error:", refundError);
            toast.error("Request approved but refund processing failed. Please process manually.");
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refund-requests"] });
      toast.success("Refund request processed");
      setProcessingId(null);
      setProcessingNotes("");
    },
    onError: (error) => {
      console.error("Error processing refund request:", error);
      toast.error("Failed to process refund request");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "approved":
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case "denied":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Refund Requests</h1>
        <p className="text-muted-foreground mt-2">
          Review and process refund requests from homeowners
        </p>
      </div>

      {requests?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No refund requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests?.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {(request as any).profiles?.full_name || "Unknown homeowner"}
                    </CardTitle>
                    <CardDescription>
                      {(request as any).profiles?.email}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Service</p>
                    <p className="font-medium">{(request as any).bookings?.service_type || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Appointment Date</p>
                    <p className="font-medium">
                      {(request as any).bookings?.date_time_start
                        ? format(new Date((request as any).bookings.date_time_start), "MMM d, yyyy")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount Requested</p>
                    <p className="font-medium">${(request.amount_requested / 100).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Requested</p>
                    <p className="font-medium">{format(new Date(request.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm">{request.reason}</p>
                </div>

                {request.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Processing Notes</p>
                    <p className="text-sm">{request.notes}</p>
                  </div>
                )}

                {request.status === "pending" && (
                  <div className="space-y-3 pt-4 border-t">
                    {processingId === request.id && (
                      <div className="space-y-2">
                        <Label htmlFor="notes">Processing notes (optional)</Label>
                        <Textarea
                          id="notes"
                          placeholder="Add any notes about this decision..."
                          value={processingNotes}
                          onChange={(e) => setProcessingNotes(e.target.value)}
                          rows={2}
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      {processingId === request.id ? (
                        <>
                          <Button
                            onClick={() => processRefund.mutate({ requestId: request.id, action: "approve" })}
                            disabled={processRefund.isPending}
                            size="sm"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm Approve
                          </Button>
                          <Button
                            onClick={() => processRefund.mutate({ requestId: request.id, action: "deny" })}
                            disabled={processRefund.isPending}
                            variant="destructive"
                            size="sm"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Confirm Deny
                          </Button>
                          <Button
                            onClick={() => {
                              setProcessingId(null);
                              setProcessingNotes("");
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => setProcessingId(request.id)} size="sm">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve Refund
                          </Button>
                          <Button
                            onClick={() => {
                              setProcessingId(request.id);
                              setTimeout(() => processRefund.mutate({ requestId: request.id, action: "deny" }), 0);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Deny Request
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
