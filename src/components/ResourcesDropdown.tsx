import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Home, MessageSquare, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ResourcesDropdown = () => {
  const navigate = useNavigate();

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-9 text-sm px-4">
            Resources
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[400px] p-4">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate("/resources/home-maintenance-survival-kit")}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left group"
                >
                  <div className="bg-primary/10 p-2 rounded-md group-hover:bg-primary/20 transition-colors">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                      Home Maintenance Survival Kit
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Generate a personalized maintenance plan with cost estimates and scheduling
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/resources/provider-communication-builder")}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left group"
                >
                  <div className="bg-primary/10 p-2 rounded-md group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                      Smart Estimate & Communication Builder
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Create professional estimates, templates, and client communications
                    </div>
                  </div>
                </button>

                <div className="border-t pt-3 mt-1">
                  <button
                    onClick={() => navigate("/resources")}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all w-full"
                  >
                    View All Resources
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};
