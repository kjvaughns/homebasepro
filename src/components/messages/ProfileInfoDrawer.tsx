import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Star, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: any;
  userType: 'homeowner' | 'provider';
}

export function ProfileInfoDrawer({ 
  open, 
  onOpenChange, 
  conversation,
  userType 
}: ProfileInfoDrawerProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!open || !conversation) return;
    
    const loadProfile = async () => {
      setLoading(true);
      try {
        if (userType === 'homeowner') {
          // Fetch provider org details
          const { data } = await supabase
            .from('organizations')
            .select(`
              *,
              provider_metrics(trust_score, rating_avg, rating_count)
            `)
            .eq('id', conversation.provider_org_id)
            .single();
          setProfile(data);
        } else {
          // Fetch homeowner profile
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', conversation.homeowner_profile_id)
            .single();
          setProfile(data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [open, conversation, userType]);
  
  if (!profile) return null;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Profile</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={profile.logo_url || profile.avatar_url} />
              <AvatarFallback className="text-2xl">
                {(profile.name || profile.full_name)?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">
              {profile.name || profile.full_name}
            </h2>
            {profile.rating_avg && (
              <div className="flex items-center gap-1 mt-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{profile.rating_avg}</span>
                <span className="text-muted-foreground text-sm">
                  ({profile.rating_count} reviews)
                </span>
              </div>
            )}
          </div>
          
          {/* Contact Info */}
          <div className="space-y-3">
            {profile.phone && (
              <a 
                href={`tel:${profile.phone}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{profile.phone}</span>
              </a>
            )}
            
            {profile.email && (
              <a 
                href={`mailto:${profile.email}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="truncate">{profile.email}</span>
              </a>
            )}
            
            {(profile.city || profile.state) && (
              <div className="flex items-center gap-3 p-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{profile.city}, {profile.state}</span>
              </div>
            )}
            
            {profile.created_at && (
              <div className="flex items-center gap-3 p-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            )}
          </div>
          
          {/* Description/Bio */}
          {profile.description && (
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm">{profile.description}</p>
            </div>
          )}
          
          {/* Action Buttons */}
          {userType === 'homeowner' && (
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => window.open(`/homeowner/browse/${profile.id}`, '_blank')}
              >
                View Full Profile
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
