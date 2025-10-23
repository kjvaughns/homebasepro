import { useTutorial } from '@/contexts/TutorialContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export function TutorialOverlay() {
  const { steps, currentStep, showTutorial, nextStep, skipTutorial, goToStep } = useTutorial();

  if (!showTutorial || steps.length === 0) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-0">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={skipTutorial}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 justify-center">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => goToStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep 
                    ? 'w-8 bg-primary' 
                    : idx < currentStep
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between gap-2">
          <Button 
            variant="outline" 
            onClick={skipTutorial}
          >
            Skip Tutorial
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => goToStep(currentStep - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={nextStep}>
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
