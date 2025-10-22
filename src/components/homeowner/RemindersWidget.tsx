import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, X, Calendar, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Reminder {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  service_category: string;
  status: string;
}

interface AIInsight {
  title: string;
  description: string;
  priority: 'high' | 'normal' | 'low';
  category: string;
  action?: string;
  estimated_cost?: string;
}

export function RemindersWidget() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    fetchReminders();
    fetchAIInsights();
  }, []);

  const fetchReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('maintenance_reminders')
        .select('*')
        .eq('homeowner_id', profile.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(3);

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      // Check cache first
      const cachedInsights = localStorage.getItem('homeowner_ai_insights');
      const cachedTimestamp = localStorage.getItem('homeowner_ai_insights_timestamp');
      
      if (cachedInsights && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp);
        if (age < 24 * 60 * 60 * 1000) { // 24 hours
          setAIInsights(JSON.parse(cachedInsights));
          return;
        }
      }

      setLoadingAI(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Get home data
      const { data: home } = await supabase
        .from('homes')
        .select('year_built, square_footage, property_type, bedrooms, bathrooms, zip_code')
        .eq('owner_id', profile.id)
        .eq('is_primary', true)
        .single();

      if (!home) {
        setLoadingAI(false);
        return;
      }

      // Call AI edge function
      const { data: insightsData, error } = await supabase.functions.invoke('get-homeowner-insights', {
        body: {
          homeData: home,
          season: getCurrentSeason()
        }
      });

      if (error) throw error;

      const insights = insightsData?.insights || [];
      setAIInsights(insights);

      // Cache results
      localStorage.setItem('homeowner_ai_insights', JSON.stringify(insights));
      localStorage.setItem('homeowner_ai_insights_timestamp', Date.now().toString());

    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  };

  const dismissReminder = async (reminderId: string) => {
    try {
      await supabase
        .from('maintenance_reminders')
        .update({ status: 'dismissed' })
        .eq('id', reminderId);
      
      setReminders(reminders.filter(r => r.id !== reminderId));
      toast.success("Reminder dismissed");
    } catch (error) {
      console.error('Error dismissing reminder:', error);
      toast.error("Failed to dismiss reminder");
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'normal':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) return null;
  if (reminders.length === 0 && aiInsights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Home Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Insights
              {aiInsights.length > 0 && (
                <Badge variant="secondary" className="ml-1">{aiInsights.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reminders">
              Reminders
              {reminders.length > 0 && (
                <Badge variant="secondary" className="ml-1">{reminders.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-3">
            {loadingAI ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : aiInsights.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Add your home details to get personalized insights</p>
              </div>
            ) : (
              aiInsights.map((insight, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="font-medium text-sm">{insight.title}</p>
                        <Badge variant={getPriorityColor(insight.priority)} className="text-xs">
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                      {insight.action && (
                        <p className="text-xs font-medium text-primary">{insight.action}</p>
                      )}
                      {insight.estimated_cost && (
                        <p className="text-xs text-muted-foreground">Est. cost: {insight.estimated_cost}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAIInsights}
              disabled={loadingAI}
              className="w-full mt-2"
            >
              {loadingAI ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Refresh Insights
            </Button>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-3">
            {reminders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active reminders</p>
              </div>
            ) : (
              reminders.map((reminder) => {
                const daysUntil = getDaysUntilDue(reminder.due_date);
                const isOverdue = daysUntil < 0;
                const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

                return (
                  <div
                    key={reminder.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium text-sm">{reminder.title}</p>
                          <Badge variant={getPriorityColor(reminder.priority)} className="text-xs">
                            {reminder.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{reminder.description}</p>
                        <p className={`text-xs font-medium ${
                          isOverdue ? 'text-destructive' : isDueSoon ? 'text-orange-600' : 'text-muted-foreground'
                        }`}>
                          {isOverdue 
                            ? `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'}`
                            : daysUntil === 0
                            ? 'Due today'
                            : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
                          }
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => dismissReminder(reminder.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
