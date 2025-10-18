import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DemoLayout } from "@/components/demo/DemoLayout";
import { RemindersCard, ProviderTable, QuoteCalculator, DashboardStats, ProcessFlowDiagram, AIChatMockup } from "@/components/demo/DemoWidgets";
import homeownerMockup from "@/assets/homeowner-mobile-mockup.png";
import { Button } from "@/components/ui/button";
import { Home, Zap, Bell, Users, DollarSign, LayoutDashboard, Sparkles } from "lucide-react";

export default function DemoHomeowner() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Owning a home shouldn't feel like a second job",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Home className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Welcome to HomeBase</h2>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Between work, family, and everything else, the last thing you need is another to-do list. 
            HomeBase keeps your home on schedule with smart reminders, verified pros, and instant quotes.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="p-4 border rounded-lg">
              <Zap className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Automated</h3>
              <p className="text-sm text-muted-foreground">Smart scheduling</p>
            </div>
            <div className="p-4 border rounded-lg">
              <Users className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Verified Pros</h3>
              <p className="text-sm text-muted-foreground">Trusted providers</p>
            </div>
            <div className="p-4 border rounded-lg">
              <DollarSign className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Fair Pricing</h3>
              <p className="text-sm text-muted-foreground">AI-powered quotes</p>
            </div>
          </div>
        </>
      ),
      widget: (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-8">
          <img 
            src={homeownerMockup} 
            alt="HomeBase app on mobile device" 
            className="max-h-[500px] w-auto object-contain animate-fade-in hover-scale"
          />
        </div>
      ),
    },
    {
      title: "How it works",
      content: (
        <>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Simple, automatic home management</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Create your account</h3>
                <p className="text-muted-foreground">Quick signup with email or Google</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Add your home address</h3>
                <p className="text-muted-foreground">We pull key property details automatically</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Book and track services</h3>
                <p className="text-muted-foreground">Browse providers, get instant quotes, schedule work</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Get smart recommendations</h3>
                <p className="text-muted-foreground">HomeBase AI learns your home and suggests maintenance</p>
              </div>
            </div>
          </div>
        </>
      ),
      widget: (
        <div className="flex items-center justify-center h-full bg-background rounded-lg p-6">
          <ProcessFlowDiagram />
        </div>
      ),
    },
    {
      title: "Smart maintenance reminders",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Never miss maintenance again</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            HomeBase automatically schedules upcoming tasks based on your home's size, age, and location. 
            Get reminders before things become problems.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Seasonal reminders (HVAC tune-ups, gutter cleaning)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Property-specific alerts based on home age and systems</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>One-click booking with pre-filled details</span>
            </li>
          </ul>
        </>
      ),
      widget: <RemindersCard />,
    },
    {
      title: "AI-powered suggestions",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">HomeBase AI learns your home</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Our AI assistant analyzes your property details, maintenance history, and local climate 
            to proactively suggest services you'll need.
          </p>
          <div className="space-y-4">
            <div className="p-4 border-l-4 border-primary bg-muted/50 rounded">
              <p className="font-medium mb-1">💡 Suggestion</p>
              <p className="text-sm text-muted-foreground">
                Your HVAC system is 8 years old. Consider a tune-up before summer heat arrives.
              </p>
            </div>
            <div className="p-4 border-l-4 border-primary bg-muted/50 rounded">
              <p className="font-medium mb-1">💡 Suggestion</p>
              <p className="text-sm text-muted-foreground">
                Heavy rain forecasted next week. Your gutters are due for cleaning.
              </p>
            </div>
          </div>
        </>
      ),
      widget: (
        <div className="flex items-center justify-center h-full">
          <AIChatMockup />
        </div>
      ),
    },
    {
      title: "Browse trusted local providers",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Verified pros in your area</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            All providers are verified, rated, and reviewed. See their availability, 
            pricing, and credentials before you book.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Background-checked and insured</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Real customer ratings and reviews</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Transparent pricing with no hidden fees</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Real-time availability and instant booking</span>
            </li>
          </ul>
        </>
      ),
      widget: <ProviderTable />,
    },
    {
      title: "Instant AI quotes",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Fair, transparent pricing</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Enter your address and get instant price estimates. Our AI considers property size, 
            local market rates, and seasonal factors to calculate fair prices.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">How pricing works:</h3>
            <p className="text-sm text-muted-foreground">
              • Base rate for the service type<br />
              • Adjusted for your property size<br />
              • Local market demand factors<br />
              • Loyalty discounts for repeat customers<br />
              • No calls, no negotiations, no surprises
            </p>
          </div>
        </>
      ),
      widget: <QuoteCalculator />,
    },
    {
      title: "Your home, organized",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <LayoutDashboard className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Everything in one place</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Track upcoming services, view maintenance history, manage receipts, 
            and message providers—all from your dashboard.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Calendar view of all scheduled services</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Complete service history and receipts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Direct messaging with providers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Home value insights and maintenance reports</span>
            </li>
          </ul>
        </>
      ),
      widget: <DashboardStats />,
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <DemoLayout
      title="Homeowner Interactive Demo"
      currentStep={currentStep}
      totalSteps={steps.length}
      onBack={() => setCurrentStep(Math.max(0, currentStep - 1))}
      onNext={() => {
        if (isLastStep) {
          navigate("/waitlist");
        } else {
          setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
        }
      }}
      canGoBack={currentStep > 0}
      canGoNext={true}
      rightPanel={currentStepData.widget}
    >
      {currentStepData.content}

      {isLastStep && (
        <div className="mt-8 p-6 border-2 border-primary rounded-lg bg-primary/5">
          <h3 className="text-2xl font-bold mb-2">Be one of the first in your city</h3>
          <p className="text-muted-foreground mb-4">
            Join the waitlist for early access and exclusive launch perks.
          </p>
          <Button size="lg" onClick={() => navigate("/waitlist")}>
            Join Waitlist Now
          </Button>
        </div>
      )}
    </DemoLayout>
  );
}
