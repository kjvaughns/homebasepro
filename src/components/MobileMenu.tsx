import { Menu, Home, DollarSign, Gift, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

export const MobileMenu = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <div className="flex flex-col gap-4 mt-6">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              className="w-full justify-between h-12 text-base"
              onClick={() => setResourcesOpen(!resourcesOpen)}
            >
              <span className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Resources
              </span>
              {resourcesOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {resourcesOpen && (
              <div className="flex flex-col gap-1 pl-4 animate-accordion-down">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 text-sm text-left"
                  onClick={() => handleNavigate("/resources/home-maintenance-survival-kit")}
                >
                  <div>
                    <div className="font-medium">Home Maintenance Survival Kit</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Generate your personalized maintenance plan
                    </div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 text-sm text-left"
                  onClick={() => handleNavigate("/resources/provider-communication-builder")}
                >
                  <div>
                    <div className="font-medium">Communication Builder</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Create professional estimates & templates
                    </div>
                  </div>
                </Button>
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start h-10 text-sm font-medium"
                  onClick={() => handleNavigate("/resources")}
                >
                  View All Resources →
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start h-12 text-base"
            onClick={() => handleNavigate("/pricing")}
          >
            <DollarSign className="h-5 w-5 mr-2" />
            Pricing
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start h-12 text-base"
            onClick={() => handleNavigate("/club")}
          >
            <Gift className="h-5 w-5 mr-2" />
            Referrals
          </Button>

          <Separator className="my-2" />

          <Button
            className="w-full h-12 text-base"
            onClick={() => handleNavigate("/waitlist")}
          >
            Join Waitlist
          </Button>

          <Separator className="my-4" />

          <div className="flex flex-col gap-2 text-sm">
            <Button
              variant="link"
              className="justify-start text-muted-foreground h-auto p-0"
              onClick={() => handleNavigate("/privacy")}
            >
              Privacy Policy
            </Button>
            <Button
              variant="link"
              className="justify-start text-muted-foreground h-auto p-0"
              onClick={() => handleNavigate("/terms")}
            >
              Terms & Conditions
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
