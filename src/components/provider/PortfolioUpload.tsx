import { useState, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NativeCameraButton } from "@/components/native/NativeCameraButton";

interface PortfolioUploadProps {
  organizationId: string;
  onUploadComplete: () => void;
}

export function PortfolioUpload({ organizationId, onUploadComplete }: PortfolioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState("completed_project");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count (max 20 total)
    if (files.length > 20) {
      toast.error("Maximum 20 images allowed");
      return;
    }

    // Validate file sizes (max 5MB each)
    const oversizedFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Each image must be under 5MB");
      return;
    }

    // Validate file types
    const invalidFiles = files.filter(
      f => !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)
    );
    if (invalidFiles.length > 0) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    setSelectedFiles(files);

    // Generate previews
    const newPreviews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === files.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current portfolio count
      const { count } = await supabase
        .from('provider_portfolio')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', organizationId);

      if ((count || 0) + selectedFiles.length > 20) {
        throw new Error(`Portfolio limit exceeded. You can have maximum 20 images (currently ${count})`);
      }

      // Get max display order
      const { data: maxOrderData } = await supabase
        .from('provider_portfolio')
        .select('display_order')
        .eq('org_id', organizationId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      let displayOrder = (maxOrderData?.display_order || 0) + 1;

      // Upload files
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('provider-images')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('provider-images')
          .getPublicUrl(fileName);

        // Insert portfolio record
        const { error: insertError } = await supabase
          .from('provider_portfolio')
          .insert({
            org_id: organizationId,
            image_url: publicUrl,
            title: title.trim() || null,
            description: description.trim() || null,
            category,
            display_order: displayOrder++,
          });

        if (insertError) throw insertError;
      }

      toast.success(`Successfully uploaded ${selectedFiles.length} image(s)`);
      
      // Reset form
      setSelectedFiles([]);
      setPreviews([]);
      setTitle("");
      setDescription("");
      setCategory("completed_project");
      
      onUploadComplete();
    } catch (error: any) {
      console.error('Error uploading portfolio:', error);
      toast.error(error.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (url: string) => {
    // Convert URL to File object for consistent handling
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    
    setSelectedFiles(prev => [...prev, file]);
    
    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* File input */}
      <div>
        <Label htmlFor="portfolio-files">Add Portfolio Images (Max 20, 5MB each)</Label>
        <div className="mt-2 flex gap-2">
          <NativeCameraButton
            onPhotoCapture={handleCameraCapture}
            storageBucket="provider-images"
            storagePath={organizationId}
            variant="outline"
            size="default"
            label="Take Photo"
          />
          <Input
            id="portfolio-files"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="flex-1"
          />
        </div>
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      {selectedFiles.length > 0 && (
        <>
          <div>
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Kitchen Remodel - Dallas, TX"
              maxLength={100}
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project..."
              maxLength={500}
              rows={3}
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={uploading}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed_project">Completed Project</SelectItem>
                <SelectItem value="before_after">Before & After</SelectItem>
                <SelectItem value="team_photo">Team Photo</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}