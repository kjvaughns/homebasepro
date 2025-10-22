import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, X, Calendar, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AIInsightCard } from "@/components/provider/AIInsightCard";

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
  type: 'tip' | 'alert' | 'suggestion';
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
          <Sparkles className="h-5 w-5" />
          HomeBase AI · Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadingAI ? (
          <div className="space-y-2">
            <div className="animate-pulse rounded-md bg-muted h-16 w-full" />
            <div className="animate-pulse rounded-md bg-muted h-16 w-full" />
          </div>
        ) : aiInsights.length > 0 ? (
        <div className="space-y-2">
          {aiInsights.map((insight, idx) => (
            <AIInsightCard 
              key={idx} 
              title={insight.title}
              description={insight.description} 
              type={insight.type}
            />
          ))}
        </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Add your home details to get personalized insights</p>
          </div>
        )}
        <Button
          variant="default"
          size="sm"
          onClick={fetchAIInsights}
          disabled={loadingAI}
          className="w-full"
        >
          {loadingAI ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Ask HomeBase AI
        </Button>
      </CardContent>
    </Card>
  );
}
