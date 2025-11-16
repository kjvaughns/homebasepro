import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "@/components/AvatarUpload";
import { HeroImageUpload } from "@/components/provider/HeroImageUpload";
import { SocialLinksEditor } from "@/components/provider/SocialLinksEditor";
import { UnifiedBookingLinks } from "./UnifiedBookingLinks";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  service_area: string | null;
  logo_url?: string | null;
}

interface BusinessProfileSectionProps {
  organization: Organization | null;
  onUpdate: (field: string, value: any) => void;
}

export function BusinessProfileSection({ organization, onUpdate }: BusinessProfileSectionProps) {
  if (!organization) return null;

  return (
    <div className="space-y-4">
      {/* Brand Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Profile Logo</Label>
            <AvatarUpload 
              avatarUrl={organization.logo_url || null}
              fullName={organization.name}
              userId={organization.id}
              onAvatarUpdate={(url) => onUpdate('logo_url', url)}
            />
          </div>
          <div>
            <HeroImageUpload 
              organizationId={organization.id}
              currentHeroUrl={undefined}
              onUploadComplete={(url) => onUpdate('hero_image_url', url)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input
              value={organization.name}
              onChange={(e) => onUpdate('name', e.target.value)}
              placeholder="Your Business Name"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={organization.description || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              placeholder="Tell customers about your business..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={organization.email || ''}
                onChange={(e) => onUpdate('email', e.target.value)}
                placeholder="contact@business.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={organization.phone || ''}
                onChange={(e) => onUpdate('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Service Area</Label>
            <Input
              value={organization.service_area || ''}
              onChange={(e) => onUpdate('service_area', e.target.value)}
              placeholder="e.g., Austin, TX or 50 mile radius"
            />
          </div>
        </CardContent>
      </Card>

      {/* Booking Links - Consolidated */}
      <UnifiedBookingLinks 
        organizationId={organization.id}
        organizationSlug={organization.slug}
        organizationName={organization.name}
      />

      {/* Social Links */}
      <SocialLinksEditor organizationId={organization.id} />
    </div>
  );
}
