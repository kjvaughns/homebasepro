import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TimeEntryCard } from "@/components/provider/TimeEntryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ApproveTime() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({
    hours: "",
    breakMinutes: "",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const orgQuery = await (supabase as any)
        .from("organizations")
        .select("id")
        .eq("owner_user_id", user.user.id)
        .single();

      const { data } = await (supabase as any)
        .from("time_entries")
        .select("*, team_members!inner(full_name, email)")
        .eq("organization_id", orgQuery.data.id)
        .order("clock_in_at", { ascending: false });

      setEntries(data || []);
    } catch (error) {
      console.error("Error loading entries:", error);
      toast({
        title: "Error",
        description: "Failed to load time entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: member } = await (supabase as any)
        .from("team_members")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      const { error } = await (supabase as any)
        .from("time_entries")
        .update({
          status: "approved",
          approved_by: member.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Approved",
        description: "Time entry has been approved",
      });

      loadEntries();
    } catch (error) {
      console.error("Error approving entry:", error);
      toast({
        title: "Error",
        description: "Failed to approve time entry",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (entryId: string) => {
    if (!confirm("Are you sure you want to reject this time entry?")) return;

    try {
      const { error } = await (supabase as any)
        .from("time_entries")
        .update({
          status: "rejected",
        })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Rejected",
        description: "Time entry has been rejected",
      });

      loadEntries();
    } catch (error) {
      console.error("Error rejecting entry:", error);
      toast({
        title: "Error",
        description: "Failed to reject time entry",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry || !entry.clock_out_at) return;

    const start = new Date(entry.clock_in_at);
    const end = new Date(entry.clock_out_at);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    setSelectedEntry(entry);
    setEditData({
      hours: hours.toFixed(2),
      breakMinutes: entry.break_minutes?.toString() || "0",
      notes: entry.notes || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry) return;

    try {
      const { error } = await (supabase as any)
        .from("time_entries")
        .update({
          break_minutes: parseInt(editData.breakMinutes),
          notes: editData.notes,
        })
        .eq("id", selectedEntry.id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Time entry has been updated",
      });

      setShowEditDialog(false);
      loadEntries();
    } catch (error) {
      console.error("Error updating entry:", error);
      toast({
        title: "Error",
        description: "Failed to update time entry",
        variant: "destructive",
      });
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = entries
      .filter((e) => e.status === "pending" && e.clock_out_at)
      .map((e) => e.id);

    if (pendingIds.length === 0) {
      toast({
        title: "No Entries",
        description: "No pending entries to approve",
      });
      return;
    }

    if (!confirm(`Approve ${pendingIds.length} time entries?`)) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: member } = await (supabase as any)
        .from("team_members")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      const { error } = await (supabase as any)
        .from("time_entries")
        .update({
          status: "approved",
          approved_by: member.id,
          approved_at: new Date().toISOString(),
        })
        .in("id", pendingIds);

      if (error) throw error;

      toast({
        title: "Approved",
        description: `${pendingIds.length} time entries approved`,
      });

      loadEntries();
    } catch (error) {
      console.error("Error bulk approving:", error);
      toast({
        title: "Error",
        description: "Failed to approve time entries",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const pendingEntries = entries.filter((e) => e.status === "pending" && e.clock_out_at);
  const approvedEntries = entries.filter((e) => e.status === "approved");
  const rejectedEntries = entries.filter((e) => e.status === "rejected");

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Approve Time</h1>
          <p className="text-sm text-muted-foreground">Review and approve team time entries</p>
        </div>
        {pendingEntries.length > 0 && (
          <Button onClick={handleBulkApprove}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve All ({pendingEntries.length})
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold">{pendingEntries.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold">{approvedEntries.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold">{rejectedEntries.length}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingEntries.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedEntries.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingEntries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending time entries to review</p>
              </CardContent>
            </Card>
          ) : (
            pendingEntries.map((entry) => (
              <TimeEntryCard
                key={entry.id}
                entry={entry}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {approvedEntries.map((entry) => (
            <TimeEntryCard key={entry.id} entry={entry} showActions={false} />
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {rejectedEntries.map((entry) => (
            <TimeEntryCard key={entry.id} entry={entry} showActions={false} />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Make adjustments to the time entry
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Total Hours (Read-only)</Label>
              <Input value={editData.hours} disabled />
            </div>

            <div className="grid gap-2">
              <Label>Break Minutes</Label>
              <Input
                type="number"
                value={editData.breakMinutes}
                onChange={(e) =>
                  setEditData({ ...editData, breakMinutes: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Notes / Reason for Edit</Label>
              <Textarea
                value={editData.notes}
                onChange={(e) =>
                  setEditData({ ...editData, notes: e.target.value })
                }
                placeholder="Add a note about this adjustment"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}