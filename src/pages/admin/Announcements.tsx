import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar, Users } from "lucide-react";
import { SendAnnouncementDialog } from "@/components/admin/SendAnnouncementDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Announcements() {
  const [showDialog, setShowDialog] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case "all": return "All Users";
      case "providers": return "Providers";
      case "homeowners": return "Homeowners";
      default: return audience;
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "normal": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">
            Send notifications to all users or specific groups
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      ) : announcements && announcements.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Title</th>
                  <th className="text-left p-4 text-sm font-medium hidden sm:table-cell">Audience</th>
                  <th className="text-left p-4 text-sm font-medium hidden md:table-cell">Priority</th>
                  <th className="text-left p-4 text-sm font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {announcements.map((announcement) => (
                  <tr key={announcement.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {announcement.body}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {getAudienceLabel(announcement.target_audience)}
                      </Badge>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <Badge variant={getPriorityColor(announcement.priority)}>
                        {announcement.priority || "normal"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(announcement.created_at!), "MMM d, yyyy")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No Announcements Yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "New Announcement" to send your first notification
            </p>
            <Button variant="outline" onClick={() => setShowDialog(true)}>
              Get Started
            </Button>
          </div>
        </Card>
      )}

      <SendAnnouncementDialog
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </div>
  );
}
