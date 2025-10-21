import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";

interface ProviderVerificationCardProps {
  provider: any;
  onUpdate: () => void;
}

export function ProviderVerificationCard({ provider, onUpdate }: ProviderVerificationCardProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const { toast } = useToast();

  const handleVerification = async (status: "verified" | "rejected") => {
    if (status === "rejected" && !notes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      setShowNotesInput(true);
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        verified_at: status === "verified" ? new Date().toISOString() : null,
        verification_notes: notes || null,
      };
      
      // Add verification_status once types are updated
      if ('verification_status' in provider) {
        updateData.verification_status = status;
      }

      const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", provider.id);

      if (error) throw error;

      toast({
        title: status === "verified" ? "Provider Verified" : "Provider Rejected",
        description: `${provider.name} has been ${status}`,
      });

      setNotes("");
      setShowNotesInput(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating verification:", error);
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{provider.name}</h3>
              <p className="text-sm text-muted-foreground">{provider.business_type || "Service Provider"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Applied: {new Date(provider.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {getStatusBadge(provider.verification_status || "pending")}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Contact</p>
            <p className="font-medium">{provider.phone || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Service Area</p>
            <p className="font-medium">{provider.service_area || "—"}</p>
          </div>
        </div>

        {provider.verification_notes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Notes:</p>
            <p className="text-sm text-muted-foreground">{provider.verification_notes}</p>
          </div>
        )}

        {(provider.verification_status === "pending" || showNotesInput) && (
          <div className="space-y-3">
            {showNotesInput && (
              <div className="space-y-2">
                <Label htmlFor={`notes-${provider.id}`}>Verification Notes</Label>
                <Textarea
                  id={`notes-${provider.id}`}
                  placeholder="Add notes (required for rejection)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => handleVerification("verified")}
                disabled={loading}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => {
                  if (showNotesInput) {
                    handleVerification("rejected");
                  } else {
                    setShowNotesInput(true);
                  }
                }}
                variant="destructive"
                disabled={loading}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {provider.verification_status === "rejected" && (
          <Button
            onClick={() => handleVerification("verified")}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Reconsider & Approve
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
