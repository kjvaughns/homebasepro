import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Insight {
  text: string;
  type: "tip" | "alert" | "suggestion";
}

export function useDashboardInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-dashboard-insights");

      if (error) {
        console.error("Error loading insights:", error);
        // Use fallback insights
        setInsights([
          { text: "Review your business metrics and client engagement", type: "tip" },
          { text: "Follow up on outstanding invoices", type: "alert" },
          { text: "Plan ahead for upcoming service appointments", type: "suggestion" }
        ]);
      } else {
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error("Failed to load insights:", error);
      // Use fallback insights
      setInsights([
        { text: "Review your business metrics and client engagement", type: "tip" },
        { text: "Follow up on outstanding invoices", type: "alert" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return { insights, loading };
}
