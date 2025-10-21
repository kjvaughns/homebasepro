import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Instagram, Facebook, Linkedin, Save } from "lucide-react";

interface SocialLinksEditorProps {
  organizationId: string;
  currentSocials?: any;
}

export function SocialLinksEditor({ organizationId, currentSocials }: SocialLinksEditorProps) {
  const [saving, setSaving] = useState(false);
  const [socials, setSocials] = useState({
    website: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    ...currentSocials
  });

  useEffect(() => {
    if (currentSocials) {
      setSocials({ ...socials, ...currentSocials });
    }
  }, [currentSocials]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ socials })
        .eq('id', organizationId);

      if (error) throw error;

      toast.success("Social links updated successfully");
    } catch (error: any) {
      console.error('Error saving social links:', error);
      toast.error("Failed to save social links");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="website" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Website
        </Label>
        <Input
          id="website"
          type="url"
          placeholder="https://yourwebsite.com"
          value={socials.website}
          onChange={(e) => setSocials({ ...socials, website: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="instagram" className="flex items-center gap-2">
          <Instagram className="h-4 w-4" />
          Instagram
        </Label>
        <Input
          id="instagram"
          type="text"
          placeholder="@yourusername"
          value={socials.instagram}
          onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="facebook" className="flex items-center gap-2">
          <Facebook className="h-4 w-4" />
          Facebook
        </Label>
        <Input
          id="facebook"
          type="text"
          placeholder="facebook.com/yourpage"
          value={socials.facebook}
          onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="linkedin" className="flex items-center gap-2">
          <Linkedin className="h-4 w-4" />
          LinkedIn
        </Label>
        <Input
          id="linkedin"
          type="text"
          placeholder="linkedin.com/company/yourcompany"
          value={socials.linkedin}
          onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Save className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Social Links
          </>
        )}
      </Button>
    </div>
  );
}