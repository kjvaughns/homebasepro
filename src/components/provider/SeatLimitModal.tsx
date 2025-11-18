import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowUpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SeatLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  seatsUsed: number;
  seatsLimit: number;
}

const PLAN_DETAILS = {
  free: { name: "Free", seats: 0, price: 0, additionalSeat: 0 },
  starter: { name: "Starter", seats: 3, price: 30, additionalSeat: 15 },
  pro: { name: "Pro", seats: 10, price: 129, additionalSeat: 15 },
};

export function SeatLimitModal({
  open,
  onOpenChange,
  currentPlan,
  seatsUsed,
  seatsLimit,
}: SeatLimitModalProps) {
  const navigate = useNavigate();

  const planInfo = PLAN_DETAILS[currentPlan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.free;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <DialogTitle>Seat Limit Reached</DialogTitle>
          </div>
          <DialogDescription>
            You've reached your team seat limit on the {planInfo.name} plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Usage</span>
              <Badge variant="secondary">
                {seatsUsed} / {seatsLimit} seats
              </Badge>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(seatsUsed / seatsLimit) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">To add more team members, you can:</h4>
            
            {currentPlan === "free" && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Upgrade to Starter</p>
                    <p className="text-sm text-muted-foreground">Get 3 team seats included</p>
                  </div>
                  <p className="text-lg font-bold">${PLAN_DETAILS.starter.price}/mo</p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/pricing");
                  }}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Upgrade Now
                </Button>
              </div>
            )}

            {currentPlan !== "free" && (
              <>
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Add Extra Seats</p>
                      <p className="text-sm text-muted-foreground">
                        ${planInfo.additionalSeat}/seat/month
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/provider/settings?tab=billing");
                    }}
                  >
                    Add Seats
                  </Button>
                </div>

                {currentPlan !== "pro" && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Upgrade Plan</p>
                        <p className="text-sm text-muted-foreground">
                          Get more seats included
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        onOpenChange(false);
                        navigate("/pricing");
                      }}
                    >
                      View Plans
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}