import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortfolioUpload } from "@/components/provider/PortfolioUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, Star, Upload } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface PortfolioImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  category: string | null;
  display_order: number;
  is_featured: boolean;
}

export default function Portfolio() {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editImage, setEditImage] = useState<PortfolioImage | null>(null);
  const [deleteImage, setDeleteImage] = useState<PortfolioImage | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!orgData?.id) {
        toast.error("No organization found");
        return;
      }

      setOrganizationId(orgData.id);

      const { data, error } = await supabase
        .from('provider_portfolio')
        .select('*')
        .eq('org_id', orgData.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error: any) {
      console.error('Error loading portfolio:', error);
      toast.error("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (image: PortfolioImage) => {
    setEditImage(image);
    setEditTitle(image.title || "");
    setEditDescription(image.description || "");
    setEditCategory(image.category || "completed_project");
    setEditFeatured(image.is_featured);
  };

  const handleSaveEdit = async () => {
    if (!editImage) return;

    try {
      const { error } = await supabase
        .from('provider_portfolio')
        .update({
          title: editTitle.trim() || null,
          description: editDescription.trim() || null,
          category: editCategory,
          is_featured: editFeatured,
        })
        .eq('id', editImage.id);

      if (error) throw error;

      toast.success("Image updated successfully");
      setEditImage(null);
      loadPortfolio();
    } catch (error: any) {
      console.error('Error updating image:', error);
      toast.error("Failed to update image");
    }
  };

  const handleDelete = async () => {
    if (!deleteImage) return;

    try {
      // Extract file path from URL
      const url = new URL(deleteImage.image_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('provider-images') + 1).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('provider-images')
        .remove([filePath]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('provider_portfolio')
        .delete()
        .eq('id', deleteImage.id);

      if (dbError) throw dbError;

      toast.success("Image deleted successfully");
      setDeleteImage(null);
      loadPortfolio();
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error("Failed to delete image");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portfolio Manager</CardTitle>
              <CardDescription>
                Manage your portfolio images ({images.length}/20)
              </CardDescription>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} disabled={images.length >= 20}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Images
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">No portfolio images yet</p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Image
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <div className="relative aspect-video">
                    <img
                      src={image.image_url}
                      alt={image.title || "Portfolio image"}
                      className="w-full h-full object-cover"
                    />
                    {image.is_featured && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Featured
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-3">
                    {image.title && (
                      <h4 className="font-semibold text-sm truncate">{image.title}</h4>
                    )}
                    {image.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {image.description}
                      </p>
                    )}
                    {image.category && (
                      <span className="text-xs px-2 py-1 bg-muted rounded-md">
                        {image.category.replace('_', ' ')}
                      </span>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(image)}
                        className="flex-1"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteImage(image)}
                        className="flex-1"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Portfolio Images</DialogTitle>
          </DialogHeader>
          <PortfolioUpload
            organizationId={organizationId}
            onUploadComplete={() => {
              setUploadDialogOpen(false);
              loadPortfolio();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editImage} onOpenChange={() => setEditImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger id="edit-category">
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-featured"
                checked={editFeatured}
                onChange={(e) => setEditFeatured(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-featured" className="cursor-pointer">
                Feature this image
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditImage(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteImage} onOpenChange={() => setDeleteImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The image will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}