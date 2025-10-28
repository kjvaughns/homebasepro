import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import WorkflowTimeline from "@/components/homeowner/WorkflowTimeline";

export default function ServiceProgress() {
  const { serviceRequestId } = useParams<{ serviceRequestId: string }>();
  const navigate = useNavigate();

  if (!serviceRequestId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Service Not Found</h2>
          <p className="text-muted-foreground mb-4">Unable to find the requested service</p>
          <Button onClick={() => navigate('/homeowner/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Service Progress</h1>
            <p className="text-muted-foreground mt-1">
              Track your service from request to completion
            </p>
          </div>
        </div>

        {/* Workflow Timeline */}
        <WorkflowTimeline serviceRequestId={serviceRequestId} compact={false} />
      </div>
    </div>
  );
}
