import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface TutorialStep {
  id: string;
  role: string;
  step_order: number;
  title: string;
  description: string;
  route: string;
  icon: string;
}

interface TutorialContextType {
  steps: TutorialStep[];
  currentStep: number;
  showTutorial: boolean;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  goToStep: (step: number) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children, role }: { children: React.ReactNode; role: 'homeowner' | 'provider' }) {
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTutorialSteps();
    checkIfShouldShow();
  }, [role]);

  const loadTutorialSteps = async () => {
    const { data } = await supabase
      .from('tutorial_steps')
      .select('*')
      .eq('role', role)
      .order('step_order');
    
    if (data) setSteps(data);
  };

  const checkIfShouldShow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('seen_tutorial_at')
      .eq('user_id', user.id)
      .single();

    // Show if never seen tutorial
    if (!profile?.seen_tutorial_at) {
      setShowTutorial(true);
    }
  };

  const startTutorial = () => {
    setCurrentStep(0);
    setShowTutorial(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      navigate(steps[nextStepIndex].route);
    } else {
      skipTutorial(); // Finished
    }
  };

  const skipTutorial = async () => {
    setShowTutorial(false);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ seen_tutorial_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
      navigate(steps[step].route);
    }
  };

  return (
    <TutorialContext.Provider value={{
      steps,
      currentStep,
      showTutorial,
      startTutorial,
      nextStep,
      skipTutorial,
      goToStep
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorial must be used within TutorialProvider');
  return context;
};
