import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DisputeDrawerProps {
  dispute: any;
  onClose: () => void;
  onRefresh: () => void;
}

export function DisputeDrawer({ dispute, onClose, onRefresh }: DisputeDrawerProps) {
  const daysUntilDue = dispute.due_by
    ? Math.ceil((new Date(dispute.due_by).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dispute Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {daysUntilDue && daysUntilDue < 7 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Response due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold">
                ${(dispute.amount || 0).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {dispute.reason?.replace('_', ' ')}
              </p>
            </div>
            <Badge
              variant={
                dispute.status === "won"
                  ? "default"
                  : dispute.status === "lost"
                  ? "destructive"
                  : "secondary"
              }
            >
              {dispute.status}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-3">
            <DetailRow label="Created" value={new Date(dispute.created_at).toLocaleString()} />
            {dispute.due_by && (
              <DetailRow label="Due By" value={new Date(dispute.due_by).toLocaleString()} />
            )}
            {dispute.charge_id && (
              <DetailRow label="Charge ID" value={dispute.charge_id} mono />
            )}
            {dispute.stripe_dispute_id && (
              <DetailRow label="Dispute ID" value={dispute.stripe_dispute_id} mono />
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Submit Evidence</h4>
            <p className="text-sm text-muted-foreground">
              Upload documentation to support your case
            </p>

            <div>
              <Label htmlFor="evidence-text">Written Evidence</Label>
              <Textarea
                id="evidence-text"
                placeholder="Describe the transaction and provide details..."
                rows={5}
              />
            </div>

            <div>
              <Label>Supporting Documents</Label>
              <Button variant="outline" className="w-full mt-2">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                PDFs, images, invoices, work orders, signed contracts
              </p>
            </div>

            <Button className="w-full">Submit Evidence</Button>
          </div>

          {dispute.evidence && Object.keys(dispute.evidence).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Submitted Evidence</h4>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(dispute.evidence, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
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