import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Bot } from "lucide-react";
import { toast } from "sonner";

interface AIQuestion {
  id: string;
  question: string;
}

interface AIFollowUpQuestionsProps {
  providerId: string;
  serviceId: string;
  intakeResponses: Record<string, any>;
  responses: Record<string, string>;
  onResponsesChange: (responses: Record<string, string>) => void;
}

export function AIFollowUpQuestions({
  providerId,
  serviceId,
  intakeResponses,
  responses,
  onResponsesChange
}: AIFollowUpQuestionsProps) {
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (!generated && Object.keys(intakeResponses).length > 0) {
      generateQuestions();
    }
  }, [intakeResponses]);

  const generateQuestions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("ai-booking-assistant", {
        body: {
          provider_id: providerId,
          service_id: serviceId,
          intake_responses: intakeResponses
        }
      });

      if (error) throw error;

      setQuestions(data.questions || []);
      setGenerated(true);
    } catch (error) {
      console.error("Error generating AI questions:", error);
      toast.error("Failed to generate follow-up questions");
      // Continue without AI questions
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    onResponsesChange({
      ...responses,
      [questionId]: value
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          AI is analyzing your responses and generating personalized questions...
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Bot className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
        <p>No additional questions needed. You're all set!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <Bot className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-semibold mb-1">AI-Powered Follow-up</h3>
          <p className="text-sm text-muted-foreground">
            Based on your responses, here are some clarifying questions to help the provider better understand your needs.
          </p>
        </div>
      </div>

      {questions.map((question, index) => (
        <div key={question.id} className="space-y-2">
          <Label>
            {index + 1}. {question.question}
          </Label>
          <Textarea
            value={responses[question.id] || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Your answer..."
            rows={3}
          />
        </div>
      ))}

      {!generated && (
        <Button
          onClick={generateQuestions}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Questions...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4 mr-2" />
              Generate AI Follow-up Questions
            </>
          )}
        </Button>
      )}
    </div>
  );
}
