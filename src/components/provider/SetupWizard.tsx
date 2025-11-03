import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, CreditCard, UserPlus, FileText, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmbeddedConnectOnboarding from "./EmbeddedConnectOnboarding";
import { AddClientDialog } from "./AddClientDialog";
import CreateJobModal from "./CreateJobModal";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { supabase } from "@/integrations/supabase/client";

interface SetupWizardProps {
  open: boolean;
  onClose: () => void;
}

export function SetupWizard({ open, onClose }: SetupWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showStripeOnboarding, setShowStripeOnboarding] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [firstClient, setFirstClient] = useState<any>(null);

  const totalSteps = 4;
  const progress = (completedSteps.length / totalSteps) * 100;

  const steps = [
    {
      number: 1,
      title: "Connect Stripe",
      description: "Set up payments to get paid",
      icon: CreditCard,
      action: () => setShowStripeOnboarding(true),
    },
    {
      number: 2,
      title: "Add Your First Client",
      description: "Import or add a client manually",
      icon: UserPlus,
      action: () => setShowAddClient(true),
    },
    {
      number: 3,
      title: "Create Your First Job",
      description: "Schedule work for your client",
      icon: Briefcase,
      action: () => setShowCreateJob(true),
    },
    {
      number: 4,
      title: "Send Your First Invoice",
      description: "Get paid for your work",
      icon: FileText,
      action: () => setShowCreateInvoice(true),
    },
  ];

  const handleStepComplete = (stepNumber: number) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps([...completedSteps, stepNumber]);
    }
    
    if (stepNumber < totalSteps) {
      setCurrentStep(stepNumber + 1);
    } else {
      // All steps complete
      saveSetupProgress();
      onClose();
    }
  };

  const saveSetupProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ 
        setup_completed: true as any,
        setup_completed_at: new Date().toISOString() as any
      })
      .eq("user_id", user.id);
  };

  const handleSkip = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <>
      <Dialog open={open && !showStripeOnboarding && !showAddClient && !showCreateJob && !showCreateInvoice} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to HomeBase! 🎉</DialogTitle>
            <DialogDescription>
              Let's get your business set up in {totalSteps} quick steps
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Setup Progress</span>
                <span className="font-medium">{completedSteps.length}/{totalSteps} Complete</span>
              </div>
              <Progress value={progress} />
            </div>

            {/* Current Step */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className={`rounded-full p-3 ${completedSteps.includes(currentStepData.number) ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {completedSteps.includes(currentStepData.number) ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <currentStepData.icon className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{currentStepData.title}</h3>
                    <span className="text-xs text-muted-foreground">Step {currentStep}/{totalSteps}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{currentStepData.description}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={currentStepData.action} className="flex-1">
                  {completedSteps.includes(currentStepData.number) ? 'Review' : 'Start'}
                </Button>
                <Button variant="ghost" onClick={handleSkip}>
                  Skip for now
                </Button>
              </div>
            </div>

            {/* All Steps Checklist */}
            <div className="space-y-2">
              {steps.map((step) => (
                <div key={step.number} className="flex items-center gap-3 text-sm">
                  {completedSteps.includes(step.number) ? (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 flex-shrink-0" />
                  )}
                  <span className={completedSteps.includes(step.number) ? 'text-foreground' : 'text-muted-foreground'}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Onboarding */}
      <Dialog open={showStripeOnboarding} onOpenChange={setShowStripeOnboarding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Stripe</DialogTitle>
            <DialogDescription>
              Set up your payment account to start receiving payments
            </DialogDescription>
          </DialogHeader>
          <EmbeddedConnectOnboarding 
            onComplete={() => {
              setShowStripeOnboarding(false);
              handleStepComplete(1);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Client */}
      <AddClientDialog
        open={showAddClient}
        onOpenChange={setShowAddClient}
        onSuccess={() => {
          setShowAddClient(false);
          handleStepComplete(2);
        }}
      />

      {/* Create Job */}
      <CreateJobModal
        open={showCreateJob}
        onOpenChange={setShowCreateJob}
        preSelectedClient={firstClient}
        onSuccess={() => {
          setShowCreateJob(false);
          handleStepComplete(3);
        }}
      />

      {/* Create Invoice */}
      {showCreateInvoice && (
        <CreateInvoiceModal
          open={showCreateInvoice}
          onClose={() => {
            setShowCreateInvoice(false);
            handleStepComplete(4);
          }}
        />
      )}
    </>
  );
}
