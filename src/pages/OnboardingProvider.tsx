import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { TradeSelector } from "@/components/onboarding/TradeSelector";
import { AIServiceGenerator } from "@/components/onboarding/AIServiceGenerator";
import { EditableServicesList } from "@/components/onboarding/EditableServicesList";
import { AIPricingCoach, PricingStrategy } from "@/components/onboarding/AIPricingCoach";
import { ClientQABuilder } from "@/components/onboarding/ClientQABuilder";
import { FeatureToggles } from "@/components/onboarding/FeatureToggles";
import { PlanComparison } from "@/components/onboarding/PlanComparison";
import { StripePaymentCollection } from "@/components/onboarding/StripePaymentCollection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, CheckCircle2, Calendar } from "lucide-react";

interface Service {
  name: string;
  description: string;
  base_price_cents: number;
  duration_minutes: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'text' | 'multiple_choice' | 'yes_no' | 'number' | 'image';
  options?: string[];
  complexity_weight: number;
  is_required: boolean;
}

interface OnboardingData {
  tradeType: string | null;
  customTrade: string;
  businessName: string;
  phone: string;
  serviceArea: string;
  businessDescription: string;
  services: Service[];
  pricingStrategy: PricingStrategy;
  clientQuestions: Question[];
  calendarSynced: boolean;
  calendarType: 'google' | 'apple' | null;
  aiFeatures: {
    quote_followups: boolean;
    payment_reminders: boolean;
    review_requests: boolean;
    appointment_reminders: boolean;
  };
  selectedPlan: 'trial' | 'free';
  stripeConnected: boolean;
  paymentMethodId: string | null;
}

export default function OnboardingProvider() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Detect system preference on mount
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('onboarding-theme') as 'light' | 'dark' | null;
      if (savedTheme) return savedTheme;
      
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'dark';
  });
  
  const [formData, setFormData] = useState<OnboardingData>({
    tradeType: null,
    customTrade: "",
    businessName: "",
    phone: "",
    serviceArea: "",
    businessDescription: "",
    services: [],
    pricingStrategy: {
      category: '',
      overhead_per_job_cents: 0,
      urgency_surcharge_pct: 0,
      enable_urgency_surcharge: false
    },
    clientQuestions: [],
    calendarSynced: false,
    calendarType: null,
    aiFeatures: {
      quote_followups: true,
      payment_reminders: true,
      review_requests: true,
      appointment_reminders: true
    },
    selectedPlan: 'trial',
    stripeConnected: false,
    paymentMethodId: null
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('onboarding-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('onboarding-theme', newTheme);
  };

  useEffect(() => {
    const loadProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFormData(prev => ({
          ...prev,
          businessName: user.user_metadata?.full_name || "",
          phone: user.user_metadata?.phone || ""
        }));
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_progress')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.onboarding_progress) {
          const progress = profile.onboarding_progress as any;
          setFormData(prev => ({ ...prev, ...progress }));
        }
      }
    };
    loadProgress();
  }, []);

  const saveProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ onboarding_progress: formData as any }).eq('user_id', user.id);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.businessName || !formData.tradeType) {
      toast.error("Please select a trade and enter business name first");
      return;
    }
    
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-business-description', {
        body: {
          name: formData.businessName,
          tradeType: formData.tradeType === 'other' ? formData.customTrade : formData.tradeType,
          location: formData.serviceArea
        }
      });
      
      if (error) throw error;
      setFormData(prev => ({ ...prev, businessDescription: data.description }));
      toast.success("Description generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate description");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const finalTradeType = formData.tradeType === 'other' ? formData.customTrade : formData.tradeType;

      const { data: org, error: orgError } = await supabase.from('organizations').insert({
        name: formData.businessName,
        slug: formData.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        trade_type: finalTradeType,
        service_area: formData.serviceArea,
        ai_generated_description: formData.businessDescription,
        owner_id: user.id,
        plan: 'free'
      }).select().single();

      if (orgError) throw orgError;

      if (formData.services.length > 0) {
        await supabase.from('provider_services').insert(
          formData.services.map(s => ({
            organization_id: org.id,
            name: s.name,
            description: s.description,
            base_price_cents: s.base_price_cents,
            duration_minutes: s.duration_minutes,
            ai_generated: true
          }))
        );
      }

      const updateData: any = {
        onboarded_at: new Date().toISOString(),
        trade_type: finalTradeType,
        pricing_preferences: formData.pricingStrategy,
        ai_features_enabled: formData.aiFeatures,
        onboarding_progress: null,
        plan_type: formData.selectedPlan
      };

      if (formData.selectedPlan === 'trial' && formData.paymentMethodId) {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        updateData.trial_started_at = new Date().toISOString();
        updateData.trial_ends_at = trialEndDate.toISOString();
        updateData.stripe_payment_method_id = formData.paymentMethodId;
      }

      await supabase.from('profiles').update(updateData).eq('user_id', user.id);

      toast.success(formData.selectedPlan === 'trial' ? "Your 7-day Pro trial has started! 🎉" : "Welcome to HomeBase!");
      navigate('/provider/dashboard');
    } catch (error: any) {
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && !formData.tradeType) return toast.error("Please select your trade");
    if (currentStep === 1 && formData.tradeType === 'other' && !formData.customTrade.trim()) return toast.error("Please specify your trade");
    if (currentStep === 2 && (!formData.businessName || !formData.serviceArea)) return toast.error("Please fill in business name and service area");
    if (currentStep === 3 && formData.services.length === 0) return toast.error("Please generate at least one service");
    if (currentStep === 4 && !formData.pricingStrategy.category) return toast.error("Please select a pricing category");

    if (currentStep === 8) {
      if (formData.selectedPlan === 'trial') {
        setCurrentStep(9);
        await saveProgress();
        return;
      } else {
        await handleComplete();
        return;
      }
    }

    if (currentStep === 9) {
      if (!formData.paymentMethodId) return toast.error("Please add a payment method or choose the free plan");
      await handleComplete();
      return;
    }

    await saveProgress();
    if (currentStep < 9) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };
  const handlePaymentSuccess = async (paymentMethodId: string) => {
    setFormData(prev => ({ ...prev, paymentMethodId }));
    toast.success("Payment method saved!");
    await handleComplete();
  };
  const handlePaymentSkip = async () => {
    setFormData(prev => ({ ...prev, selectedPlan: 'free', paymentMethodId: null }));
    toast.info("Switched to Free Plan");
    await handleComplete();
  };

  return (
    <OnboardingFrame theme={theme}>
      <OnboardingHeader theme={theme} onThemeToggle={handleThemeToggle} />
      <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        <OnboardingProgress currentStep={currentStep} totalSteps={10} />

        {currentStep === 0 && (
          <OnboardingCard title="Welcome to HomeBase Pro" subtitle="Set up your business in under 3 minutes">
            <div className="space-y-4 text-center">
              <div className="text-6xl mb-4">🏠</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✨ AI-powered service generation</p>
                <p>💳 Instant payments & invoicing</p>
                <p>📅 Smart scheduling & reminders</p>
              </div>
            </div>
          </OnboardingCard>
        )}

        {currentStep === 1 && (
          <OnboardingCard title="What's your trade?" subtitle="Select your primary service category">
            <TradeSelector selected={formData.tradeType} onSelect={(trade) => setFormData(prev => ({ ...prev, tradeType: trade }))} customTrade={formData.customTrade} onCustomTradeChange={(value) => setFormData(prev => ({ ...prev, customTrade: value }))} />
          </OnboardingCard>
        )}

        {currentStep === 2 && (
          <OnboardingCard title="Tell us about your business" subtitle="Basic information to get started">
            <div className="space-y-4">
              <div><Label>Business Name</Label><Input value={formData.businessName} onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))} placeholder="e.g., Joe's Plumbing" className="bg-background" /></div>
              <div><Label>Phone Number</Label><Input type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="(555) 123-4567" className="bg-background" /></div>
              <div><Label>Service Area (ZIP)</Label><Input value={formData.serviceArea} onChange={(e) => setFormData(prev => ({ ...prev, serviceArea: e.target.value }))} placeholder="e.g., 90210" className="bg-background" /></div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Business Description</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={generatingDescription || !formData.businessName || !formData.tradeType}>
                    {generatingDescription ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating...</> : <><Sparkles className="h-3 w-3 mr-1" />AI Generate</>}
                  </Button>
                </div>
                <Textarea value={formData.businessDescription} onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))} placeholder="Describe your services..." rows={4} className="bg-background" />
              </div>
            </div>
          </OnboardingCard>
        )}

        {currentStep === 3 && (
          <OnboardingCard title="Your services" subtitle="Let AI generate your service catalog">
            <AIServiceGenerator tradeType={formData.tradeType === 'other' ? formData.customTrade : formData.tradeType || ''} onGenerate={(services) => setFormData(prev => ({ ...prev, services }))} />
            {formData.services.length > 0 && <EditableServicesList services={formData.services} onChange={(services) => setFormData(prev => ({ ...prev, services }))} />}
          </OnboardingCard>
        )}

        {currentStep === 4 && (
          <OnboardingCard title="AI Pricing Intelligence" subtitle="Get market-informed pricing guidance">
            <AIPricingCoach 
              tradeType={formData.tradeType === 'other' ? formData.customTrade : formData.tradeType || ''}
              serviceArea={formData.serviceArea}
              value={formData.pricingStrategy}
              onChange={(strategy) => setFormData(prev => ({ ...prev, pricingStrategy: strategy }))}
            />
          </OnboardingCard>
        )}

        {currentStep === 5 && (
          <OnboardingCard title="Client Intake Questions" subtitle="Collect key info to scope jobs better (optional)">
            <ClientQABuilder
              tradeType={formData.tradeType === 'other' ? formData.customTrade : formData.tradeType || ''}
              questions={formData.clientQuestions}
              onChange={(questions) => setFormData(prev => ({ ...prev, clientQuestions: questions }))}
            />
          </OnboardingCard>
        )}

        {currentStep === 6 && (
          <OnboardingCard title="Sync your calendar" subtitle="Connect to auto-detect availability (optional)">
            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => toast.info("Calendar sync coming soon!")}><Calendar className="h-4 w-4 mr-2" />Google Calendar</Button>
              <Button variant="outline" className="w-full" onClick={() => toast.info("Calendar sync coming soon!")}><Calendar className="h-4 w-4 mr-2" />Apple Calendar</Button>
              <p className="text-xs text-center text-muted-foreground mt-4">You can skip this and set it up later</p>
            </div>
          </OnboardingCard>
        )}

        {currentStep === 7 && (
          <OnboardingCard title="AI automation features" subtitle="Let AI handle the busywork">
            <FeatureToggles value={formData.aiFeatures} onChange={(value) => setFormData(prev => ({ ...prev, aiFeatures: value }))} />
          </OnboardingCard>
        )}

        {currentStep === 8 && (
          <OnboardingCard title="Choose your plan" subtitle="Start with a 7-day Pro trial or use Free forever">
            <PlanComparison selected={formData.selectedPlan} onSelect={(plan) => setFormData(prev => ({ ...prev, selectedPlan: plan }))} />
          </OnboardingCard>
        )}

        {currentStep === 8 && formData.selectedPlan === 'trial' && (
          <OnboardingCard title="Start your 7-day trial" subtitle="Add payment method to unlock Pro features">
            <StripePaymentCollection onSuccess={handlePaymentSuccess} onSkip={handlePaymentSkip} />
          </OnboardingCard>
        )}

        <div className="flex gap-3 pt-4">
          {currentStep > 0 && currentStep !== 8 && <Button variant="outline" onClick={handleBack} disabled={loading}>Back</Button>}
          {currentStep < 8 && (
            <Button onClick={handleNext} disabled={loading} className="flex-1">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : currentStep === 7 && formData.selectedPlan === 'free' ? <><CheckCircle2 className="h-4 w-4 mr-2" />Complete Setup</> : "Continue"}
            </Button>
          )}
        </div>
      </div>
    </OnboardingFrame>
  );
}
