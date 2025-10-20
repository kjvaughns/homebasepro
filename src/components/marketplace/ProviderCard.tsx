import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Clock, Star, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProviderCardProps {
  provider: {
    provider_id: string;
    name: string;
    slug?: string;
    trust_score?: number;
    soonest_slot?: string;
    logo_url?: string;
    category?: string;
    city?: string;
    tagline?: string;
    distance_mi?: number;
    avg_response_time_hours?: number;
    verified?: boolean;
    completion_rate?: number;
  };
  onBook?: (providerId: string) => void;
  onViewProfile?: (providerId: string) => void;
  compact?: boolean;
}

export const ProviderCard = ({ provider, onBook, onViewProfile, compact = false }: ProviderCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="bg-card border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:border-primary/20">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border-2 border-border">
          <AvatarImage src={provider.logo_url} alt={provider.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            <Building2 className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">{provider.name}</h3>
                {provider.verified && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              {provider.tagline && !compact && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{provider.tagline}</p>
              )}
            </div>
            
            {provider.trust_score && (
              <Badge variant="outline" className="gap-1 shrink-0">
                <Star className="h-3 w-3 fill-current text-yellow-500" />
                {provider.trust_score.toFixed(1)}
              </Badge>
            )}
          </div>

          {!compact && (
            <div className="mt-3 space-y-1.5 text-sm">
              {provider.category && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-xs">{provider.category}</span>
                </div>
              )}
              
              {provider.city && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-xs">{provider.city}</span>
                  {provider.distance_mi && (
                    <span className="text-xs">• {provider.distance_mi.toFixed(1)} mi away</span>
                  )}
                </div>
              )}

              {provider.soonest_slot && (
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">Next: {provider.soonest_slot}</span>
                </div>
              )}

              {provider.avg_response_time_hours && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    Responds in {provider.avg_response_time_hours}h avg
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {onViewProfile && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onViewProfile(provider.provider_id)}
          >
            View Profile
          </Button>
        )}
        {onBook && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onBook(provider.provider_id)}
          >
            Book Now
          </Button>
        )}
      </div>
    </Card>
  );
};
