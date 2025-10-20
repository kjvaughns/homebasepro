import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  howItWorksLink?: string;
  trackingId?: string;
}

export function ResourceCard({
  icon,
  title,
  description,
  ctaText,
  ctaLink,
  howItWorksLink,
  trackingId,
}: ResourceCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 hover:border-primary">
      <div className="flex flex-col gap-6">
        <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>

        <div className="flex flex-col gap-3 mt-auto">
          <Button
            onClick={() => navigate(ctaLink)}
            className="w-full"
            size="lg"
            data-track={trackingId}
          >
            {ctaText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          {howItWorksLink && (
            <button
              onClick={() => navigate(howItWorksLink)}
              className="text-sm text-primary hover:underline flex items-center justify-center gap-1"
            >
              <Info className="h-3 w-3" />
              How it works
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
