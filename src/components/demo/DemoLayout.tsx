import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface DemoLayoutProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  children: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function DemoLayout({
  title,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  canGoBack,
  canGoNext,
  children,
  rightPanel,
}: DemoLayoutProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-4">{title}</h1>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Panel - Content */}
          <div className="space-y-8 animate-fade-in">
            {children}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={!canGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={onNext}
                disabled={!canGoNext}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Panel - Visual/Widget */}
          <div className="lg:sticky lg:top-8 animate-scale-in">
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
