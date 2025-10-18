import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DemoLayout } from "@/components/demo/DemoLayout";
import { CalendarRouteMock, ClientTable, QuoteCalculator, InvoiceList } from "@/components/demo/DemoWidgets";
import { Button } from "@/components/ui/button";
import { Briefcase, Zap, Calendar, Users, DollarSign, TrendingUp, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DemoProvider() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "You didn't start your business to juggle admin",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Welcome to HomeBase for Providers</h2>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Stop losing hours to scheduling, quotes, and payment chasing. 
            HomeBase gets you booked, scheduled, and paid—automatically.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="p-4 border rounded-lg">
              <Calendar className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Smart Scheduling</h3>
              <p className="text-sm text-muted-foreground">Auto-optimized routes</p>
            </div>
            <div className="p-4 border rounded-lg">
              <Zap className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">AI Quotes</h3>
              <p className="text-sm text-muted-foreground">Dynamic pricing</p>
            </div>
            <div className="p-4 border rounded-lg">
              <DollarSign className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Instant Payouts</h3>
              <p className="text-sm text-muted-foreground">Get paid upfront</p>
            </div>
          </div>
        </>
      ),
      widget: <img src="/placeholder.svg" alt="Provider Portal" className="w-full rounded-lg shadow-lg" />,
    },
    {
      title: "Running a business means wearing every hat",
      content: (
        <>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">The hidden cost of doing business</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Most service providers spend 10+ hours per week on administrative work that doesn't generate revenue.
          </p>
          <div className="space-y-4">
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📞</div>
                  <div>
                    <h3 className="font-semibold">Back-and-forth calls</h3>
                    <p className="text-sm text-muted-foreground">Answering "how much?" 20+ times per day</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🗓️</div>
                  <div>
                    <h3 className="font-semibold">Manual scheduling</h3>
                    <p className="text-sm text-muted-foreground">Juggling calendars and driving routes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💰</div>
                  <div>
                    <h3 className="font-semibold">Payment chasing</h3>
                    <p className="text-sm text-muted-foreground">Waiting 30+ days to get paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ),
      widget: <img src="/placeholder.svg" alt="Pain Points" className="w-full rounded-lg shadow-lg" />,
    },
    {
      title: "How HomeBase works for providers",
      content: (
        <>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Your business on autopilot</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Homeowners book you through HomeBase</h3>
                <p className="text-muted-foreground">They find you in the marketplace, see your availability, and request service</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">AI generates a dynamic quote</h3>
                <p className="text-muted-foreground">Using property data and your pricing rules to calculate fair market rates</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">You confirm and complete the job</h3>
                <p className="text-muted-foreground">Drag-drop scheduling, optimized routes, direct client messaging</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Get paid instantly via Stripe</h3>
                <p className="text-muted-foreground">Auto-invoicing and instant payouts—no more payment chasing</p>
              </div>
            </div>
          </div>
        </>
      ),
      widget: <img src="/placeholder.svg" alt="How it works" className="w-full rounded-lg shadow-lg" />,
    },
    {
      title: "Your Provider Control Center",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">One dashboard for everything</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Accept bookings, manage clients, track revenue, optimize routes, and handle payouts—all from one place.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Real-time booking notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Client CRM with service history and LTV</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Revenue analytics and forecasting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Team management and payroll (for growing businesses)</span>
            </li>
          </ul>
        </>
      ),
      widget: (
        <Card>
          <CardHeader>
            <CardTitle>Provider Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">$8,450</p>
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">42</p>
                <p className="text-sm text-muted-foreground">Active Clients</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">18</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">4.8</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      title: "Smart scheduling & route optimization",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Work smarter, not harder</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Drag-drop appointment scheduling with AI-powered route optimization. 
            Cut windshield time and maximize billable hours.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Visual calendar with drag-and-drop scheduling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>AI stacks nearby jobs to minimize drive time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Turn-by-turn navigation for daily routes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Automated appointment reminders to clients</span>
            </li>
          </ul>
        </>
      ),
      widget: <CalendarRouteMock />,
    },
    {
      title: "Simple client CRM",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Know your clients, grow your business</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Track service history, notes, spending, and upcoming visits—all in one clean interface.
          </p>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">What you can do:</h3>
              <ul className="space-y-2 text-sm">
                <li>• View complete service history for each client</li>
                <li>• Track lifetime value (LTV) and identify top customers</li>
                <li>• Add private notes and preferences</li>
                <li>• See recurring service schedules and renewal dates</li>
                <li>• Export client data for tax season</li>
              </ul>
            </div>
          </div>
        </>
      ),
      widget: <ClientTable />,
    },
    {
      title: "HomeBase AI with dynamic pricing",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Set your rates once, quote instantly</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Define your pricing rules (per acre, per sqft, flat rate) and let HomeBase AI 
            adjust quotes based on property size, materials, and local demand.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Set base rates and profit margins once</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>AI automatically adjusts for property specifics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Seasonal multipliers for peak demand periods</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Loyalty discounts for repeat customers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>No more "I'll have to call you back with a price"</span>
            </li>
          </ul>
        </>
      ),
      widget: <QuoteCalculator />,
    },
    {
      title: "Invoices & instant payouts",
      content: (
        <>
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-10 h-10 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">Get paid upfront, every time</h2>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Automated invoicing, flexible payment options for customers (including BNPL), 
            and instant payouts via Stripe Connect. No more chasing payments.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Auto-invoicing when jobs are marked complete</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Customers can pay with credit card, ACH, or BNPL</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>You get paid instantly, even if customer uses BNPL</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Built-in escrow protection for larger jobs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span>Tax-ready reports and 1099 generation</span>
            </li>
          </ul>
        </>
      ),
      widget: <InvoiceList />,
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <DemoLayout
      title="Service Provider Interactive Demo"
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
          <h3 className="text-2xl font-bold mb-2">Join the HomeBase Provider Network</h3>
          <p className="text-muted-foreground mb-4">
            Free to join. Only pay a small fee when you're booked. Get early access now.
          </p>
          <Button size="lg" onClick={() => navigate("/waitlist")}>
            Get Early Access
          </Button>
        </div>
      )}
    </DemoLayout>
  );
}
