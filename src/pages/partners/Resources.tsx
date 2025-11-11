import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, FileText, Image, Video } from "lucide-react";

export default function PartnersResources() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("brand_assets")
        .select("*")
        .eq("is_public", true)
        .order("category")
        .order("sort_order");

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error("Error loading assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "logo":
        return <Image className="h-5 w-5" />;
      case "media":
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const groupedAssets = assets.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = [];
    }
    acc[asset.category].push(asset);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/partners/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Brand Resources</h1>
              <p className="text-sm text-muted-foreground">
                Download logos, templates, and marketing materials
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading resources...</p>
          </div>
        ) : assets.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No resources available yet</p>
            <p className="text-sm text-muted-foreground">
              Check back soon for brand assets and marketing materials
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedAssets).map(([category, categoryAssets]: [string, any[]]) => (
              <Card key={category} className="p-6">
                <h2 className="text-xl font-bold mb-4 capitalize flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {category}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{asset.title}</h3>
                          {asset.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {asset.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-muted-foreground">
                          {asset.file_type?.toUpperCase()}
                          {asset.file_size && ` • ${(asset.file_size / 1024).toFixed(0)}KB`}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(asset.file_url, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {/* Brand Colors */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Brand Colors</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="w-full h-24 bg-primary rounded-lg mb-2"></div>
                  <p className="text-sm font-medium">Primary</p>
                  <p className="text-xs text-muted-foreground font-mono">#3B82F6</p>
                </div>
                <div>
                  <div className="w-full h-24 bg-accent rounded-lg mb-2"></div>
                  <p className="text-sm font-medium">Accent</p>
                  <p className="text-xs text-muted-foreground font-mono">#8B5CF6</p>
                </div>
                <div>
                  <div className="w-full h-24 bg-foreground rounded-lg mb-2"></div>
                  <p className="text-sm font-medium">Text</p>
                  <p className="text-xs text-muted-foreground font-mono">#1E293B</p>
                </div>
                <div>
                  <div className="w-full h-24 bg-muted rounded-lg mb-2"></div>
                  <p className="text-sm font-medium">Background</p>
                  <p className="text-xs text-muted-foreground font-mono">#F8FAFC</p>
                </div>
              </div>
            </Card>

            {/* Messaging Guidelines */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Messaging Guidelines</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">✅ Do:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Focus on automation and time-saving benefits</li>
                    <li>Highlight ease of use and simplicity</li>
                    <li>Mention specific features like booking, payments, scheduling</li>
                    <li>Use "HomeBase" (capital B) in all references</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">❌ Don't:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Make exaggerated claims or promises</li>
                    <li>Compare negatively to competitors</li>
                    <li>Use technical jargon or complex terms</li>
                    <li>Write "Home Base" (two words) or "homebase" (lowercase)</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
