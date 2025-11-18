import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wrench, UserPlus, CreditCard } from "lucide-react";

interface NewProviderWelcomeProps {
  hasAnyData: boolean;
  onOpenWizard?: () => void;
}

export const NewProviderWelcome = ({ hasAnyData, onOpenWizard }: NewProviderWelcomeProps) => {
  const navigate = useNavigate();

  if (hasAnyData) return null;

  return (
    <Card className="col-span-full">
      <CardContent className="p-12 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Welcome to HomeBase! 🎉</h2>
          <p className="text-muted-foreground">
            Your business account is ready. Let's set up the essentials so you can start accepting jobs and getting paid.
          </p>
        </div>
        {onOpenWizard && (
          <Button onClick={onOpenWizard} size="lg" className="mb-4">
            Start Setup Wizard
          </Button>
        )}
        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Button onClick={() => navigate('/provider/settings?tab=payments')} variant="outline">
            <CreditCard className="mr-2 h-4 w-4" />
            Connect Stripe
          </Button>
          <Button onClick={() => navigate('/provider/clients')} variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Clients
          </Button>
          <Button onClick={() => navigate('/provider/schedule')} variant="outline">
            <Wrench className="mr-2 h-4 w-4" />
            Create Jobs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
