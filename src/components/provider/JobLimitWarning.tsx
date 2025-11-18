import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface JobLimitWarningProps {
  completedJobs: number;
  jobLimit: number;
  isAtLimit: boolean;
}

export function JobLimitWarning({ completedJobs, jobLimit, isAtLimit }: JobLimitWarningProps) {
  const navigate = useNavigate();
  const remaining = jobLimit - completedJobs;

  if (isAtLimit) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            You've reached your free plan limit of {jobLimit} completed jobs this month. Upgrade to continue completing jobs.
          </span>
          <Button 
            onClick={() => navigate('/provider/billing')} 
            variant="default"
            size="sm"
          >
            Upgrade to Starter
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (remaining <= 2) {
    return (
      <Alert className="mb-4 border-orange-500/50 bg-orange-500/10">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-orange-900 dark:text-orange-100">
            You have {remaining} completed job{remaining !== 1 ? 's' : ''} remaining this month on the free plan. 
            Upgrade to Starter to get unlimited jobs and cut your transaction fee from 8% to 4%.
          </span>
          <Button 
            onClick={() => navigate('/provider/billing')} 
            variant="outline"
            size="sm"
            className="border-orange-500 text-orange-700 hover:bg-orange-500/20"
          >
            View Plans
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
