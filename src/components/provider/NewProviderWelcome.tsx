import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wrench, UserPlus, CreditCard } from "lucide-react";

interface NewProviderWelcomeProps {
  hasAnyData: boolean;
}

export const NewProviderWelcome = ({ hasAnyData }: NewProviderWelcomeProps) => {
  const navigate = useNavigate();

  if (hasAnyData) return null;

  return (
    <Card className="col-span-full">
      <CardContent className="p-12 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Welcome to HomeBase! 🎉</h2>
          <p className="text-muted-foreground">
            Let's get your business set up in three simple steps
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Button onClick={() => navigate('/provider/services')} variant="default">
            <Wrench className="mr-2 h-4 w-4" />
            Set Up Services
          </Button>
          <Button onClick={() => navigate('/provider/clients')} variant="default">
            <UserPlus className="mr-2 h-4 w-4" />
            Import Clients
          </Button>
          <Button onClick={() => navigate('/provider/settings/payment')} variant="default">
            <CreditCard className="mr-2 h-4 w-4" />
            Connect Stripe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
