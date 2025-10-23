import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface DocumentsLibraryProps {
  profileId: string;
}

export function DocumentsLibrary({ profileId }: DocumentsLibraryProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, [profileId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('homeowner_documents')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('homeowner_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully"
      });

      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      maintenance_plan: "Maintenance Plan",
      receipt: "Receipt",
      estimate: "Estimate",
      other: "Other"
    };
    return labels[type] || type;
  };

  const getDocumentTypeColor = (type: string): "default" | "secondary" | "outline" => {
    const colors: Record<string, "default" | "secondary" | "outline"> = {
      maintenance_plan: "default",
      receipt: "secondary",
      estimate: "outline",
      other: "outline"
    };
    return colors[type] || "outline";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
            <p className="text-sm text-muted-foreground">
              Documents like maintenance plans and receipts will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                </div>
                <CardDescription>
                  {format(new Date(doc.created_at), 'MMM d, yyyy')}
                  {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                </CardDescription>
              </div>
              <Badge variant={getDocumentTypeColor(doc.document_type)}>
                {getDocumentTypeLabel(doc.document_type)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(doc.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
