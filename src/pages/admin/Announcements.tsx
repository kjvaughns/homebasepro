import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { SendAnnouncementDialog } from "@/components/admin/SendAnnouncementDialog";

export default function Announcements() {
  const [showDialog, setShowDialog] = useState(false);

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

      <Card className="p-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Send Announcements</h3>
          <p className="text-muted-foreground mb-4">
            Click "New Announcement" to send notifications to your users
          </p>
          <Button variant="outline" onClick={() => setShowDialog(true)}>
            Get Started
          </Button>
        </div>
      </Card>

      <SendAnnouncementDialog
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </div>
  );
}
