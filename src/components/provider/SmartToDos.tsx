import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowRight } from "lucide-react";
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

      console.log('[SmartToDos] Checking unpaid invoices for org:', org.id);

      const generatedTodos: ToDo[] = [];

      // Check for unpaid invoices - WITH DEBUG LOGGING
      const { data: unpaidInvoices, count: unpaidCount, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, amount", { count: 'exact' })
        .eq("organization_id", org.id)
        .in("status", ["pending", "overdue"]);

      console.log('[SmartToDos] Unpaid invoices query result:', {
        count: unpaidCount,
        error: invoiceError,
        invoiceIds: unpaidInvoices?.map(i => ({ 
          id: i.id, 
          number: i.invoice_number, 
          status: i.status, 
          amount: i.amount 
        }))
      });

      if (unpaidCount && unpaidCount > 0) {
        generatedTodos.push({
          id: 'unpaid-invoices',
          title: `${unpaidCount} unpaid ${unpaidCount === 1 ? 'invoice' : 'invoices'}`,
          description: `Follow up to collect ${unpaidCount === 1 ? 'payment' : 'payments'}`,
          priority: 'high',
          action: `/provider/money?tab=invoices&filter=unpaid`,
          icon: DollarSign
        });
      }

      setTodos(generatedTodos);
    } catch (error) {
      console.error("Error generating todos:", error);
    }
  };

  const handleAction = (action?: string) => {
    if (action) {
      triggerHaptic('light');
      navigate(action);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  if (todos.length === 0) {
    return null;
  }

  // Show only top 2 urgent items as compact banners
  return (
    <div className="space-y-2">
      {todos.slice(0, 2).map((todo) => (
        <Card key={todo.id} className={`border ${getPriorityColor(todo.priority)}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0">
                <todo.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{todo.title}</p>
                <p className="text-xs text-muted-foreground">{todo.description}</p>
              </div>
              {todo.action && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0"
                  onClick={() => handleAction(todo.action)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
