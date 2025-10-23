import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("support_tickets" as any)
        .select("*, profiles!support_tickets_profile_id_fkey(full_name, email)")
        .order("created_at", { ascending: false }) as any;

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      console.error("Fetch tickets error:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets" as any)
        .update({ 
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null
        } as any)
        .eq("id", ticketId);

      if (error) throw error;
      toast.success("Ticket status updated");
      fetchTickets();
    } catch (error: any) {
      console.error("Update status error:", error);
      toast.error("Failed to update status");
    }
  };

  const assignToSelf = async (ticketId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("support_tickets" as any)
        .update({ assigned_to: user.id } as any)
        .eq("id", ticketId);

      if (error) throw error;
      toast.success("Ticket assigned to you");
      fetchTickets();
    } catch (error: any) {
      console.error("Assign error:", error);
      toast.error("Failed to assign ticket");
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: "secondary",
      medium: "outline",
      high: "default",
      urgent: "destructive",
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      open: { icon: MessageSquare, variant: "outline" },
      in_progress: { icon: Clock, variant: "default" },
      resolved: { icon: CheckCircle, variant: "secondary" },
      closed: { icon: XCircle, variant: "secondary" },
    };
    const config = variants[status] || variants.open;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">Manage customer support requests</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tickets ({tickets.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No tickets found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket #</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-mono text-xs">
                            {ticket.ticket_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{ticket.profiles?.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{ticket.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                          <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(ticket.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!ticket.assigned_to && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => assignToSelf(ticket.id)}
                                >
                                  Assign
                                </Button>
                              )}
                              {ticket.status === "open" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                                >
                                  Start
                                </Button>
                              )}
                              {ticket.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => updateTicketStatus(ticket.id, "resolved")}
                                >
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
