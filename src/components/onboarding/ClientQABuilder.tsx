import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Question {
  text: string;
  type: 'text' | 'yes_no' | 'multiple_choice' | 'number' | 'image';
  options?: string[];
  complexity: number;
  required: boolean;
}

interface ClientQABuilderProps {
  tradeType: string;
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export function ClientQABuilder({ tradeType, questions, onChange }: ClientQABuilderProps) {
  const [problemDescription, setProblemDescription] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!problemDescription.trim()) {
      toast.error("Please describe typical client problems");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-intake-questions', {
        body: { tradeType, problemDescription }
      });

      if (error) throw error;

      if (data?.questions) {
        const formattedQuestions: Question[] = data.questions.map((q: any) => ({
          text: q.question_text,
          type: q.question_type,
          options: q.options,
          complexity: q.complexity_weight,
          required: q.is_required
        }));
        
        onChange(formattedQuestions);
        toast.success(`Generated ${formattedQuestions.length} questions!`);
        setProblemDescription("");
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {questions.length === 0 ? (
        <div className="space-y-4">
          <Textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="e.g., Leaky faucets, clogged drains, water heater issues"
            className="min-h-[100px]"
            style={{ background: 'hsla(var(--onboarding-card))', border: '1px solid hsla(var(--onboarding-border))', color: 'hsl(var(--onboarding-text))' }}
          />
          <Button onClick={handleGenerate} disabled={generating} className="w-full" style={{ background: 'linear-gradient(90deg, hsl(var(--onboarding-green)), hsl(var(--accent)))', color: '#0b0d10' }}>
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate with AI</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={idx} className="p-4 rounded-lg flex justify-between" style={{ background: 'hsla(var(--onboarding-card))', border: '1px solid hsla(var(--onboarding-border))' }}>
              <div>
                <p className="font-medium">{q.text}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">{q.type}</Badge>
                  <Badge>Weight: {q.complexity}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onChange(questions.filter((_, i) => i !== idx))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={() => { setProblemDescription(""); onChange([]); }} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}
