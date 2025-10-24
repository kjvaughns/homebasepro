import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, DollarSign, UserPlus, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Reminder {
  id: string;
  type: 'follow_up' | 'invoice_overdue' | 'rebook' | 'review';
  title: string;
  description: string;
  dueDate: Date;
  actionUrl: string;
  priority: 'high' | 'medium' | 'low';
}

export function RemindersWidget() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      // Load overdue invoices
      const { data: overdueInvoices } = await supabase
        .from("payments")
        .select("id, amount, created_at, clients(name)")
        .eq("org_id", org.id)
        .in("status", ["open", "pending"])
        .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Load clients who haven't booked in 60 days
      const { data: inactiveClients } = await supabase
        .from("clients")
        .select("id, name, last_contact_at")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .lt("last_contact_at", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      const newReminders: Reminder[] = [];

      // Add overdue invoice reminders
      overdueInvoices?.forEach((invoice: any) => {
        const daysPast = Math.floor((Date.now() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60 * 24));
        newReminders.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice_overdue',
          title: `Invoice overdue (${daysPast} days)`,
          description: `${invoice.clients?.name || 'Client'} - $${invoice.amount}`,
          dueDate: new Date(invoice.created_at),
          actionUrl: `/provider/payments`,
          priority: daysPast > 30 ? 'high' : 'medium',
        });
      });

      // Add inactive client reminders
      inactiveClients?.forEach((client: any) => {
        const daysSince = Math.floor((Date.now() - new Date(client.last_contact_at).getTime()) / (1000 * 60 * 60 * 24));
        newReminders.push({
          id: `rebook-${client.id}`,
          type: 'rebook',
          title: `Follow up with ${client.name}`,
          description: `No contact in ${daysSince} days`,
          dueDate: new Date(),
          actionUrl: `/provider/clients`,
          priority: 'low',
        });
      });

      // Sort by priority and date
      newReminders.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setReminders(newReminders.slice(0, 5));
    } catch (error) {
      console.error("Error loading reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (reminderId: string) => {
    setReminders(reminders.filter(r => r.id !== reminderId));
    toast.success("Reminder dismissed");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice_overdue': return DollarSign;
      case 'rebook': return UserPlus;
      case 'follow_up': return Bell;
      default: return Clock;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  if (loading || reminders.length === 0) return null;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {reminders.map((reminder) => {
          const Icon = getIcon(reminder.type);
          return (
            <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg border">
              <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium">{reminder.title}</p>
                  <Badge variant={getPriorityColor(reminder.priority)} className="text-xs">
                    {reminder.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{reminder.description}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(reminder.actionUrl)}
                    className="h-7 text-xs"
                  >
                    Take Action
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(reminder.id)}
                    className="h-7 text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Done
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
