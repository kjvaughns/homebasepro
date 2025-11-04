import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Lock, Download, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PostTrialLockoutProps {
  onUpgrade?: () => void;
}

export const PostTrialLockout = ({ onUpgrade }: PostTrialLockoutProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/provider/settings?tab=billing');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-2">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Your Trial Has Ended</CardTitle>
          <CardDescription className="text-base">
            We've saved all your data — clients, jobs, payments, and messages. 
            Upgrade now to keep your business flowing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-muted/50">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your account is now in <strong>read-only mode</strong>. You can view your data and export it, 
              but you'll need to upgrade to continue managing your business.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">What you can still do:</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>View all your clients, jobs, and payment history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Export your data to CSV</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Review your business analytics</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-4">
            <Button onClick={handleUpgrade} size="lg" className="w-full text-lg">
              <Sparkles className="mr-2 h-5 w-5" />
              Upgrade to Pro — Keep Growing
            </Button>
            <Button 
              onClick={() => navigate('/provider/dashboard')} 
              variant="outline" 
              size="lg"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Export My Data
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-4">
            Questions? <a href="/support" className="text-primary hover:underline">Contact our team</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
