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
import { ServicesList } from "@/components/onboarding/ServicesList";
import { PricingSliders } from "@/components/onboarding/PricingSliders";
import { FeatureToggles } from "@/components/onboarding/FeatureToggles";
import { PlanComparison } from "@/components/onboarding/PlanComparison";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Calendar, ArrowRight } from "lucide-react";

interface Service {
  name: string;
  description: string;
  base_price_cents: number;
  duration_minutes: number;
}

interface OnboardingData {
  tradeType: string | null;
  businessName: string;
  phone: string;
  serviceArea: string;
  businessDescription: string;
  services: Service[];
  pricingPreferences: {
    min: number;
    avg: number;
    max: number;
  };
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
}

export default function OnboardingProvider() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  
  const [formData, setFormData] = useState<OnboardingData>({
    tradeType: null,
    businessName: "",
    phone: "",
    serviceArea: "",
    businessDescription: "",
    services: [],
    pricingPreferences: { min: 50, avg: 250, max: 1500 },
    calendarSynced: false,
    calendarType: null,
    aiFeatures: {
      quote_followups: true,
      payment_reminders: true,
      review_requests: true,
      appointment_reminders: true
    },
    selectedPlan: 'trial',
    stripeConnected: false
  });

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Pre-fill from auth metadata
        setFormData(prev => ({
          ...prev,
          businessName: user.user_metadata?.full_name || "",
          phone: user.user_metadata?.phone || ""
        }));
        
        // Load saved progress
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_progress')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.onboarding_progress) {
          const progress = profile.onboarding_progress as any as OnboardingData;
          setFormData(prev => ({ ...prev, ...progress }));
          // If they have progress, start at their last step
          if (progress.tradeType) {
            const lastStep = progress.services?.length > 0 ? 4 : 
                           progress.tradeType ? 2 : 0;
            setCurrentStep(lastStep);
          }
        }
      }
    };
    loadProgress();
  }, []);

  // Save progress after each step
  const saveProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_progress: formData as any })
        .eq('user_id', user.id);
    }
  };

  // Generate business description with AI
  const handleGenerateDescription = async () => {
    if (!formData.businessName || !formData.tradeType) {
      toast.error("Please select a trade and enter business name first");
      return;
    }
    
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-business-description', {
        body: {
          businessName: formData.businessName,
          tradeType: formData.tradeType,
          location: formData.serviceArea
        }
      });
      
      if (error) throw error;
      
      setFormData(prev => ({
        ...prev,
        businessDescription: data.description
      }));
      
      toast.success("Description generated!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to generate description");
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Handle services generated from AI
  const handleServicesGenerated = (services: Service[]) => {
    setFormData(prev => ({ ...prev, services }));
    toast.success(`Generated ${services.length} services!`);
  };

  // Final submission
  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // 1. Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.businessName,
          slug: formData.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          trade_type: formData.tradeType,
          service_area: formData.serviceArea,
          description: formData.businessDescription,
          owner_id: user.id,
          plan: 'free'
        })
        .select()
        .single();
      
      if (orgError) throw orgError;
      
      // 2. Create services
      if (formData.services.length > 0) {
        const { error: servicesError } = await supabase
          .from('provider_services')
          .insert(
            formData.services.map(s => ({
              organization_id: org.id,
              name: s.name,
              description: s.description,
              base_price_cents: s.base_price_cents,
              duration_minutes: s.duration_minutes
            }))
          );
        
        if (servicesError) throw servicesError;
      }
      
      // 3. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarded_at: new Date().toISOString(),
          onboarding_progress: null
        })
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;
      
      // 4. Show success message
      if (formData.selectedPlan === 'trial') {
        toast.success("Your 14-day Pro trial has started! 🎉");
      } else {
        toast.success("Welcome to HomeBase!");
      }
      
      // 5. Navigate to dashboard
      navigate('/provider/dashboard');
      
    } catch (error: any) {
      console.error("Completion error:", error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const handleNext = async () => {
    // Validate current step
    if (currentStep === 1 && !formData.tradeType) {
      toast.error("Please select your trade");
      return;
    }
    
    if (currentStep === 2 && (!formData.businessName || !formData.serviceArea)) {
      toast.error("Please fill in business name and service area");
      return;
    }
    
    if (currentStep === 3 && formData.services.length === 0) {
      toast.error("Please generate at least one service");
      return;
    }
    
    // Save progress
    await saveProgress();
    
    // Move to next step or complete
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await saveProgress();
    setCurrentStep(currentStep + 1);
  };

  return (
    <OnboardingFrame>
      <OnboardingHeader />
      
      <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        <OnboardingProgress currentStep={currentStep} totalSteps={8} />
        
        {/* Step 0: Welcome */}
        {currentStep === 0 && (
          <OnboardingCard>
            <div className="text-center space-y-4">
              <div className="text-4xl">👋</div>
              <h2 className="text-2xl font-bold" style={{ color: 'hsl(var(--onboarding-text))' }}>
                Welcome to HomeBase Pro
              </h2>
              <p className="text-sm" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                Set up your business in under 3 minutes with AI assistance
              </p>
              
              <div className="grid gap-3 mt-6">
                <div className="flex items-center gap-3 p-3 rounded-lg" 
                     style={{ background: 'hsla(var(--onboarding-card))' }}>
                  <div className="text-2xl">⚡</div>
                  <div className="text-left">
                    <div className="font-bold text-sm" style={{ color: 'hsl(var(--onboarding-text))' }}>
                      Lightning Fast Setup
                    </div>
                    <div className="text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                      AI generates your services automatically
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg" 
                     style={{ background: 'hsla(var(--onboarding-card))' }}>
                  <div className="text-2xl">🤖</div>
                  <div className="text-left">
                    <div className="font-bold text-sm" style={{ color: 'hsl(var(--onboarding-text))' }}>
                      Smart Automation
                    </div>
                    <div className="text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                      Auto follow-ups, reminders & more
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg" 
                     style={{ background: 'hsla(var(--onboarding-card))' }}>
                  <div className="text-2xl">💳</div>
                  <div className="text-left">
                    <div className="font-bold text-sm" style={{ color: 'hsl(var(--onboarding-text))' }}>
                      Get Paid Instantly
                    </div>
                    <div className="text-xs" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                      Connect your bank in minutes
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => setCurrentStep(1)} 
                className="w-full mt-6"
                size="lg"
              >
                Start Setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </OnboardingCard>
        )}
        
        {/* Step 1: Trade Selection */}
        {currentStep === 1 && (
          <OnboardingCard>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'hsl(var(--onboarding-text))' }}>
              What's your trade?
            </h3>
            <TradeSelector
              selected={formData.tradeType}
              onSelect={(trade) => setFormData(prev => ({ ...prev, tradeType: trade }))}
            />
          </OnboardingCard>
        )}
        
        {/* Step 2: Business Information */}
        {currentStep === 2 && (
          <OnboardingCard>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'hsl(var(--onboarding-text))' }}>
              Tell us about your business
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label style={{ color: 'hsl(var(--onboarding-text))' }}>Business Name</Label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="e.g., Smith Plumbing"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label style={{ color: 'hsl(var(--onboarding-text))' }}>Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label style={{ color: 'hsl(var(--onboarding-text))' }}>Service Area (ZIP Code)</Label>
                <Input
                  value={formData.serviceArea}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceArea: e.target.value }))}
                  placeholder="90210"
                  className="mt-1"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label style={{ color: 'hsl(var(--onboarding-text))' }}>Business Description</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription || !formData.businessName}
                  >
                    {generatingDescription ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span className="ml-1 text-xs">Generate with AI</span>
                  </Button>
                </div>
                <Textarea
                  value={formData.businessDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                  placeholder="Tell clients about your business..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
          </OnboardingCard>
        )}
        
        {/* Step 3: AI Service Generation */}
        {currentStep === 3 && (
          <OnboardingCard>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'hsl(var(--onboarding-text))' }}>
              What services do you offer?
            </h3>
            
            <AIServiceGenerator
              tradeType={formData.tradeType || ''}
              defaultDescription={`I offer ${formData.tradeType} services including...`}
              onServicesGenerated={handleServicesGenerated}
            />
            
            {formData.services.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--onboarding-text))' }}>
                  Generated Services:
                </p>
                <ServicesList services={formData.services} />
              </div>
            )}
          </OnboardingCard>
        )}
        
        {/* Step 4: Pricing Intelligence */}
        {currentStep === 4 && (
          <OnboardingCard>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'hsl(var(--onboarding-text))' }}>
              Set your pricing range
            </h3>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--onboarding-muted))' }}>
              Help our AI suggest realistic quotes for your jobs
            </p>
            
            <PricingSliders
              value={formData.pricingPreferences}
              onChange={(prefs) => setFormData(prev => ({ ...prev, pricingPreferences: prefs }))}
            />
          </OnboardingCard>
        )}
        
        {/* Step 5: Calendar Integration (Optional) */}
        {currentStep === 5 && (
          <OnboardingCard>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'hsl(var(--onboarding-text))' }}>
              Sync your calendar
            </h3>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--onboarding-muted))' }}>
              AI will automatically detect your open slots
            </p>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  toast.info("Google Calendar sync coming soon!");
                  setFormData(prev => ({ ...prev, calendarSynced: true, calendarType: 'google' }));
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  toast.info("Apple Calendar sync coming soon!");
                  setFormData(prev => ({ ...prev, calendarSynced: true, calendarType: 'apple' }));
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Connect Apple Calendar
              </Button>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </div>
          </OnboardingCard>
        )}
        
        {/* Step 6: AI Features & Automation */}
        {currentStep === 6 && (
          <OnboardingCard>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'hsl(var(--onboarding-text))' }}>
              Enable AI automation
            </h3>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--onboarding-muted))' }}>
              Let HomeBase handle follow-ups automatically
            </p>
            
            <FeatureToggles
              value={formData.aiFeatures}
              onChange={(features) => setFormData(prev => ({ ...prev, aiFeatures: features }))}
            />
          </OnboardingCard>
        )}
        
        {/* Step 7: Plan Selection */}
        {currentStep === 7 && (
          <OnboardingCard>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'hsl(var(--onboarding-text))' }}>
              Choose your plan
            </h3>
            
            <PlanComparison
              selected={formData.selectedPlan}
              onSelect={(plan) => setFormData(prev => ({ ...prev, selectedPlan: plan }))}
            />
          </OnboardingCard>
        )}
        
        {/* Navigation Buttons */}
        <div className="flex gap-3 sticky bottom-0 pt-4 pb-2" 
             style={{ 
               background: 'linear-gradient(180deg, transparent, hsl(var(--onboarding-bg-end)) 20%)',
             }}>
          {currentStep > 0 && currentStep < 7 && (
            <Button 
              variant="ghost" 
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </Button>
          )}
          
          {currentStep > 0 && (
            <Button 
              onClick={handleNext} 
              className="flex-1" 
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === 7 ? (
                "Complete Setup"
              ) : (
                "Continue"
              )}
            </Button>
          )}
        </div>
      </div>
    </OnboardingFrame>
  );
}
