import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';

export default function Tutorials() {
  const { startTutorial, steps, goToStep } = useTutorial();

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tutorials & Help</h1>
        <p className="text-muted-foreground">
          Learn how to get the most out of HomeBase
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Getting Started Tour</CardTitle>
          <CardDescription>
            Take a guided tour of the platform ({steps.length} steps)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startTutorial} className="w-full sm:w-auto">
            <Play className="mr-2 h-4 w-4" />
            Start Tutorial
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tutorial Steps</h2>
        <div className="grid gap-4">
          {steps.map((step, idx) => (
            <Card key={step.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => goToStep(idx)}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{step.title}</CardTitle>
                    <CardDescription className="text-sm">{step.description}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
