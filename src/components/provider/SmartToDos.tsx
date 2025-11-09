import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Users, DollarSign, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDespia } from "@/hooks/useDespia";

interface ToDo {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  icon: any;
}

export function SmartToDos() {
  const [todos, setTodos] = useState<ToDo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { triggerHaptic } = useDespia();

  useEffect(() => {
    generateSmartToDos();
  }, []);

  const generateSmartToDos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (orgError || !org) return;

      const generatedTodos: ToDo[] = [];

      // Check for unpaid invoices - simplified query
      const { count: unpaidCount } = await supabase
        .from("invoices" as any)
        .select("*", { count: 'exact', head: true })
        .eq("provider_id", org.id)
        .eq("status", "pending");

      if (unpaidCount && unpaidCount > 0) {
        generatedTodos.push({
          id: 'unpaid-invoices',
          title: `Follow up on ${unpaidCount} unpaid ${unpaidCount === 1 ? 'invoice' : 'invoices'}`,
          description: `${unpaidCount} ${unpaidCount === 1 ? 'invoice needs' : 'invoices need'} attention`,
          priority: 'high',
          action: `/provider/money`,
          icon: DollarSign
        });
      }

      // Check for pending quotes - simplified query
      const { count: quotesCount } = await supabase
        .from("quotes" as any)
        .select("*", { count: 'exact', head: true })
        .eq("provider_id", org.id)
        .eq("status", "sent");

      if (quotesCount && quotesCount > 0) {
        generatedTodos.push({
          id: 'follow-up-quotes',
          title: "Follow up on quotes",
          description: `You have ${quotesCount} pending ${quotesCount === 1 ? 'quote' : 'quotes'}`,
          priority: 'medium',
          action: `/provider/schedule?tab=quotes`,
          icon: FileText
        });
      }

      // Note: Client count check removed due to TypeScript type inference issues
      // Can be re-added with an RPC function if needed

      setTodos(generatedTodos);
    } catch (error) {
      console.error("Error generating todos:", error);
    }
  };

  const handleToggle = (todoId: string, action?: string) => {
    setCompletedTodos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) {
        triggerHaptic('light');
        newSet.delete(todoId);
      } else {
        triggerHaptic('success');
        newSet.add(todoId);
        if (action) {
          // Navigate after a brief delay so user sees the check
          setTimeout(() => navigate(action), 300);
        }
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-destructive/50';
      case 'medium': return 'border-primary/50';
      default: return 'border-border';
    }
  };

  if (todos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            You're all caught up! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Smart To-Do's
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className={`flex items-start gap-3 p-3 rounded-xl border ${getPriorityColor(todo.priority)} ${
              completedTodos.has(todo.id) ? 'opacity-50' : ''
            } hover:bg-accent/50 transition-colors cursor-pointer`}
            onClick={() => handleToggle(todo.id, todo.action)}
          >
            <Checkbox
              checked={completedTodos.has(todo.id)}
              onCheckedChange={() => handleToggle(todo.id, todo.action)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <todo.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium text-sm">{todo.title}</span>
                {todo.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{todo.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
