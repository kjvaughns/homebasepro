import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClientFilesTabProps {
  clientId: string;
  files: any[];
  onUpdate: () => void;
}

export default function ClientFilesTab({
  clientId,
  files,
  onUpdate,
}: ClientFilesTabProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleteFile, setDeleteFile] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      for (const file of Array.from(fileList)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${clientId}/${Date.now()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("client-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create file record
        const category = file.type.startsWith("image/")
          ? "photo"
          : file.type.includes("pdf")
          ? "contract"
          : "other";

        const { error: dbError } = await supabase.from("client_files").insert({
          client_id: clientId,
          file_path: fileName,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          category,
          uploaded_by: user.id,
        });

        if (dbError) throw dbError;
      }

      toast({
        title: "Files uploaded",
        description: `${fileList.length} file(s) uploaded successfully`,
      });
      onUpdate();
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-files")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteFile) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("client-files")
        .remove([deleteFile.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("client_files")
        .delete()
        .eq("id", deleteFile.id);

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: "File has been removed",
      });
      setDeleteFile(null);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (fileType.includes("pdf")) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "contract":
        return "bg-blue-500/10 text-blue-500";
      case "photo":
        return "bg-green-500/10 text-green-500";
      case "insurance":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          type="file"
          multiple
          id="file-upload"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <Button
          onClick={() => document.getElementById("file-upload")?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Files"}
        </Button>
      </div>

      {/* Files List */}
      {files.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No files yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload contracts, photos, insurance documents, and more
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {files.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-muted-foreground">{getFileIcon(file.file_type)}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{file.file_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getCategoryColor(file.category)}`}
                    >
                      {file.category}
                    </Badge>
                    <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                    <span>
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteFile(file)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteFile?.file_name}". This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
