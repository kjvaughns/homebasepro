import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  question_type: 'text' | 'multiple_choice' | 'yes_no' | 'number' | 'image';
  options?: string[];
  complexity_weight: number;
  is_required: boolean;
}

interface ClientQABuilderProps {
  tradeType: string;
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export function ClientQABuilder({ tradeType, questions, onChange }: ClientQABuilderProps) {
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    question_text: '',
    question_type: 'text',
    complexity_weight: 1,
    is_required: false,
    options: []
  });

  const getTemplateQuestions = () => {
    const templates: Record<string, Question[]> = {
      'HVAC': [
        { id: 'temp-1', question_text: 'What is the age of your HVAC system?', question_type: 'text', complexity_weight: 2, is_required: true },
        { id: 'temp-2', question_text: 'Is this an emergency repair?', question_type: 'yes_no', complexity_weight: 5, is_required: true },
        { id: 'temp-3', question_text: 'What brand is your HVAC system?', question_type: 'text', complexity_weight: 1, is_required: false },
      ],
      'Plumbing': [
        { id: 'temp-1', question_text: 'Is there active water damage?', question_type: 'yes_no', complexity_weight: 8, is_required: true },
        { id: 'temp-2', question_text: 'Where is the issue located?', question_type: 'text', complexity_weight: 2, is_required: true },
        { id: 'temp-3', question_text: 'Can you upload a photo of the problem?', question_type: 'image', complexity_weight: 3, is_required: false },
      ],
      'Lawn Care': [
        { id: 'temp-1', question_text: 'What is your lawn size in square feet?', question_type: 'number', complexity_weight: 5, is_required: true },
        { id: 'temp-2', question_text: 'How often do you want service?', question_type: 'multiple_choice', options: ['Weekly', 'Bi-weekly', 'Monthly'], complexity_weight: 2, is_required: true },
      ],
    };

    return templates[tradeType] || [];
  };

  const addQuestion = () => {
    if (!newQuestion.question_text) {
      toast.error("Please enter a question");
      return;
    }

    const question: Question = {
      id: `custom-${Date.now()}`,
      question_text: newQuestion.question_text,
      question_type: newQuestion.question_type || 'text',
      complexity_weight: newQuestion.complexity_weight || 1,
      is_required: newQuestion.is_required || false,
      options: newQuestion.options || []
    };

    onChange([...questions, question]);
    setNewQuestion({
      question_text: '',
      question_type: 'text',
      complexity_weight: 1,
      is_required: false,
      options: []
    });
    toast.success("Question added");
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
    toast.success("Question removed");
  };

  const loadTemplates = () => {
    const templates = getTemplateQuestions();
    onChange([...questions, ...templates]);
    toast.success(`Added ${templates.length} template questions`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Client Intake Questions</h3>
          <p className="text-sm text-muted-foreground">
            Collect key information upfront to better scope jobs
          </p>
        </div>
        <Button variant="outline" onClick={loadTemplates} size="sm">
          Load Templates
        </Button>
      </div>

      {/* Existing Questions */}
      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={question.id} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-foreground">{question.question_text}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="capitalize">{question.question_type.replace('_', ' ')}</span>
                  <span>Weight: {question.complexity_weight}</span>
                  {question.is_required && <span className="text-primary">Required</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeQuestion(question.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Question */}
      <div className="p-6 rounded-lg border-2 border-dashed border-border space-y-4">
        <h4 className="font-medium text-foreground">Add Custom Question</h4>
        
        <div>
          <Label htmlFor="question_text">Question Text</Label>
          <Textarea
            id="question_text"
            value={newQuestion.question_text}
            onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
            placeholder="What do you need help with?"
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="question_type">Type</Label>
            <Select
              value={newQuestion.question_type}
              onValueChange={(v) => setNewQuestion({ ...newQuestion, question_type: v as any })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="yes_no">Yes/No</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="image">Image Upload</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="complexity">Complexity Weight (1-10)</Label>
            <Input
              id="complexity"
              type="number"
              min="1"
              max="10"
              value={newQuestion.complexity_weight}
              onChange={(e) => setNewQuestion({ ...newQuestion, complexity_weight: parseInt(e.target.value) })}
              className="mt-2"
            />
          </div>
        </div>

        {newQuestion.question_type === 'multiple_choice' && (
          <div>
            <Label>Options (comma-separated)</Label>
            <Input
              value={newQuestion.options?.join(', ') || ''}
              onChange={(e) => setNewQuestion({ 
                ...newQuestion, 
                options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="Option 1, Option 2, Option 3"
              className="mt-2"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="required"
              checked={newQuestion.is_required}
              onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_required: checked })}
            />
            <Label htmlFor="required" className="cursor-pointer">Required</Label>
          </div>

          <Button onClick={addQuestion}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>
    </div>
  );
}
