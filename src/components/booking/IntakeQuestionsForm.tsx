import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface IntakeQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: any;
  is_required: boolean;
  sort_order: number;
}

interface IntakeQuestionsFormProps {
  providerId: string;
  responses: Record<string, any>;
  onResponsesChange: (responses: Record<string, any>) => void;
}

export function IntakeQuestionsForm({ 
  providerId, 
  responses, 
  onResponsesChange 
}: IntakeQuestionsFormProps) {
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, [providerId]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("client_intake_questions")
        .select("*")
        .eq("organization_id", providerId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      
      // Parse options if they're JSON strings
      const parsedData = (data || []).map(q => ({
        ...q,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : undefined
      }));
      
      setQuestions(parsedData);
    } catch (error) {
      console.error("Error loading intake questions:", error);
      toast.error("Failed to load intake questions");
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    onResponsesChange({
      ...responses,
      [questionId]: value
    });
  };

  if (loading) {
    return <div className="text-center py-4">Loading questions...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No intake questions configured for this provider.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold">Tell us about your needs</h3>
      {questions.map((question) => (
        <div key={question.id} className="space-y-2">
          <Label>
            {question.question_text}
            {question.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {question.question_type === "text" && (
            <Input
              value={responses[question.id] || ""}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              required={question.is_required}
            />
          )}

          {question.question_type === "textarea" && (
            <Textarea
              value={responses[question.id] || ""}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              required={question.is_required}
              rows={3}
            />
          )}

          {question.question_type === "multiple_choice" && question.options && (
            <RadioGroup
              value={responses[question.id] || ""}
              onValueChange={(value) => handleResponseChange(question.id, value)}
            >
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                  <Label htmlFor={`${question.id}-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.question_type === "checkbox" && question.options && (
            <div className="space-y-2">
              {question.options.map((option, index) => {
                const selectedOptions = responses[question.id] || [];
                const isChecked = selectedOptions.includes(option);
                
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${question.id}-${index}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newOptions = checked
                          ? [...selectedOptions, option]
                          : selectedOptions.filter((o: string) => o !== option);
                        handleResponseChange(question.id, newOptions);
                      }}
                    />
                    <Label htmlFor={`${question.id}-${index}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
