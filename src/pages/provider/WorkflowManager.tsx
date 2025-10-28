import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  Calendar as CalendarIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { advanceWorkflowStage } from "@/lib/workflow-sync";

interface WorkflowItem {
  id: string;
  homeowner_id: string;
  provider_org_id: string;
  workflow_stage: string;
  stage_started_at: string;
  service_request_id: string | null;
  booking_id: string | null;
  quote_id: string | null;
  homeowner_name?: string;
  service_name?: string;
  urgency_level?: string;
}

const stageColumns = [
  { id: 'leads', title: 'New Leads', stages: ['request_submitted', 'ai_analyzing', 'providers_matched'] },
  { id: 'quoted', title: 'Quoted', stages: ['quote_sent'] },
  { id: 'scheduled', title: 'Scheduled', stages: ['diagnostic_scheduled', 'job_scheduled'] },
  { id: 'active', title: 'In Progress', stages: ['diagnostic_completed', 'quote_approved', 'job_in_progress'] },
  { id: 'invoiced', title: 'Invoiced', stages: ['job_completed', 'invoice_sent'] },
  { id: 'complete', title: 'Complete', stages: ['payment_received', 'review_requested', 'workflow_complete'] }
];

export default function WorkflowManager() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");

  useEffect(() => {
    loadWorkflows();
    subscribeToChanges();

    return () => {
      supabase.removeChannel(supabase.channel('workflow-manager'));
    };
  }, []);

  const loadWorkflows = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) return;

      const { data, error } = await supabase
        .from('workflow_states')
        .select(`
          *,
          profiles:homeowner_id(full_name),
          bookings(service_name, urgency_level)
        `)
        .eq('provider_org_id', org.id)
        .not('workflow_stage', 'eq', 'workflow_complete')
        .order('stage_started_at', { ascending: false });

      if (error) throw error;

      const enriched = data?.map(w => ({
        ...w,
        homeowner_name: (w.profiles as any)?.full_name || 'Unknown',
        service_name: (w.bookings as any)?.[0]?.service_name || 'Service',
        urgency_level: (w.bookings as any)?.[0]?.urgency_level || 'medium'
      })) || [];

      setWorkflows(enriched);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('workflow-manager')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_states'
        },
        () => {
          loadWorkflows();
        }
      )
      .subscribe();

    return channel;
  };

  const handleAdvanceStage = async (workflowId: string, newStage: string) => {
    try {
      await advanceWorkflowStage(workflowId, newStage, {});
      toast.success('Workflow advanced');
      loadWorkflows();
    } catch (error) {
      toast.error('Failed to advance workflow');
    }
  };

  const getNextStage = (currentStage: string): string | null => {
    const allStages = [
      'request_submitted', 'ai_analyzing', 'providers_matched', 'quote_sent',
      'diagnostic_scheduled', 'diagnostic_completed', 'quote_approved',
      'job_scheduled', 'job_in_progress', 'job_completed', 'invoice_sent',
      'payment_received', 'review_requested', 'workflow_complete'
    ];
    const currentIndex = allStages.indexOf(currentStage);
    return currentIndex >= 0 && currentIndex < allStages.length - 1 ? allStages[currentIndex + 1] : null;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getTimeSinceStart = (startedAt: string) => {
    const hours = Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60));
    if (hours > 48) return { text: `${Math.floor(hours / 24)}d ago`, isOverdue: true };
    if (hours > 2) return { text: `${hours}h ago`, isOverdue: true };
    return { text: formatDistanceToNow(new Date(startedAt), { addSuffix: true }), isOverdue: false };
  };

  const filteredWorkflows = workflows.filter(w => {
    const matchesSearch = w.homeowner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          w.service_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === 'all' || w.workflow_stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  const groupedWorkflows = stageColumns.reduce((acc, column) => {
    acc[column.id] = filteredWorkflows.filter(w => column.stages.includes(w.workflow_stage));
    return acc;
  }, {} as Record<string, WorkflowItem[]>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage all active service workflows in one place
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {workflows.length} Active
          </Badge>
        </div>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stageColumns.map(column => (
          <Card key={column.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                {column.title}
                <Badge variant="secondary">{groupedWorkflows[column.id]?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-2">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {groupedWorkflows[column.id]?.map(workflow => {
                    const timeInfo = getTimeSinceStart(workflow.stage_started_at);
                    const nextStage = getNextStage(workflow.workflow_stage);

                    return (
                      <Card key={workflow.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{workflow.homeowner_name}</p>
                              <p className="text-xs text-muted-foreground">{workflow.service_name}</p>
                            </div>
                            <Badge 
                              variant={getUrgencyColor(workflow.urgency_level || 'medium')} 
                              className="text-xs"
                            >
                              {workflow.urgency_level}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className={timeInfo.isOverdue ? 'text-destructive font-medium' : ''}>
                              {timeInfo.text}
                            </span>
                            {timeInfo.isOverdue && <AlertCircle className="h-3 w-3 text-destructive" />}
                          </div>

                          <div className="flex gap-1">
                            {nextStage && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                onClick={() => handleAdvanceStage(workflow.id, nextStage)}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Advance
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => navigate(`/provider/jobs?workflow=${workflow.id}`)}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {groupedWorkflows[column.id]?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No workflows
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
