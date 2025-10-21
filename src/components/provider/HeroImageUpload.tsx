import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";

interface HeroImageUploadProps {
  organizationId: string;
  currentHeroUrl?: string;
  onUploadComplete: (url: string) => void;
}

export function HeroImageUpload({ organizationId, currentHeroUrl, onUploadComplete }: HeroImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentHeroUrl || "");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/hero-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('provider-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('provider-images')
        .getPublicUrl(fileName);

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ hero_image_url: publicUrl })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      setPreview(publicUrl);
      onUploadComplete(publicUrl);
      toast.success("Hero image uploaded successfully");
    } catch (error: any) {
      console.error('Error uploading hero image:', error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ hero_image_url: null })
        .eq('id', organizationId);

      if (error) throw error;

      setPreview("");
      onUploadComplete("");
      toast.success("Hero image removed");
    } catch (error: any) {
      console.error('Error removing hero image:', error);
      toast.error("Failed to remove image");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="hero-image">Hero Image</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload a banner image for your profile (recommended: 1920x400px, max 5MB)
        </p>
        
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Hero preview"
              className="w-full h-40 object-cover rounded-lg border"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Input
              id="hero-image"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <Label htmlFor="hero-image" className="cursor-pointer">
              {uploading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload hero image
                  </span>
                </div>
              )}
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}