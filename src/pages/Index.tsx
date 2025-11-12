import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Calendar, Shield, CreditCard, CheckCircle, Users, Star, TrendingUp, Sparkles, Brain, Zap, Award, Lock, Clock, Home, MessageCircle, Handshake, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import homebaseLogo from "@/assets/homebase-logo.png";
import homeownerMockup from "@/assets/homeowner-dashboard-mobile.png";
import providerMockup from "@/assets/provider-dashboard-mobile.png";
import heroProviderImage from "@/assets/hero-provider-image.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MobileMenu } from "@/components/MobileMenu";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";

const Index = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "How does HomeBase work?",
      answer: "HomeBase connects homeowners with verified service providers and handles everything from scheduling to payments. For homeowners, it's simple: tell us what you need, we match you with pros, and you track everything in one app. For providers, HomeBase automates quotes, invoices, scheduling, and client communication—so you can focus on your work.",
    },
    {
      question: "Is my data safe?",
      answer: "Absolutely. We use bank-level encryption and never share your personal information. Your data is protected with the same security standards used by major financial institutions.",
    },
    {
      question: "What types of services are available?",
      answer: "HomeBase connects you with verified providers for HVAC, plumbing, electrical, landscaping, pool care, pest control, and more. We match you based on your specific needs, location, and provider reviews.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes! Most plans are month-to-month with no long-term contracts. Cancel anytime through your account settings.",
    },
    {
      question: "How does HomeBase save me time and money?",
      answer: "HomeBase prevents expensive problems by reminding you about maintenance before breakdowns happen. It also finds you the best providers quickly, eliminating hours of research and back-and-forth communication. For providers, automated scheduling and billing means less admin work and more billable hours.",
    },
    {
      question: "What makes HomeBase different from other platforms?",
      answer: "HomeBase is the only platform that combines predictive maintenance, smart scheduling, automated operations, and verified provider matching all in one place. We handle the complexity so you don't have to.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
              <span className="text-2xl font-bold text-foreground">HomeBase</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <ResourcesDropdown />
              <Button 
                onClick={() => navigate("/pricing")} 
                variant="ghost" 
                size="sm" 
                className="h-9 text-sm px-4"
              >
                Pricing
              </Button>
              <Button 
                onClick={() => navigate("/partners")} 
                variant="ghost" 
                size="sm" 
                className="h-9 text-sm px-4"
              >
                Affiliates
              </Button>
              <Button 
                onClick={() => navigate("/demo/homeowner")} 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm px-4 whitespace-nowrap"
              >
                <Play className="h-4 w-4 mr-2" />
                Watch Demo
              </Button>
              <Button 
                onClick={() => navigate("/register")} 
                size="sm" 
                className="h-9 text-sm px-4 whitespace-nowrap"
              >
                Get Started Free
              </Button>
            </div>

            {/* Mobile Navigation */}
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Beta Pricing Banner */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="container mx-auto px-4 py-3">
          <p className="text-center text-sm md:text-base">
            <span className="font-semibold text-primary">✨ BETA LAUNCH</span>
            {" · "}
            Free for homeowners · Provider plans starting at $29/month
            {" · "}
            <button 
              onClick={() => navigate("/pricing")} 
              className="underline font-medium hover:text-primary transition-colors"
            >
              View Pricing
            </button>
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        
        {/* Animated AI Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-2 h-2 bg-primary rounded-full opacity-60 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-accent rounded-full opacity-40 animate-pulse delay-300"></div>
          <div className="absolute bottom-20 left-1/4 w-1 h-1 bg-primary rounded-full opacity-50 animate-pulse delay-700"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full mb-6 animate-fade-in border border-primary/20 max-w-full">
                <Home className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Smarter Home Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 text-foreground animate-fade-in leading-tight">
                Stop stressing about home management. <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">HomeBase keeps everything handled.</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-8 animate-fade-in">
                Whether you own a home or run a home service business, HomeBase keeps jobs, payments, and maintenance running on autopilot—so you can focus on what matters.
              </p>
              <div className="flex flex-col gap-4 items-center md:items-start animate-fade-in">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/demo/homeowner")}
                    className="text-sm sm:text-base md:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 w-full sm:w-auto"
                  >
                    For Homeowners
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate("/demo/provider")}
                    className="text-sm sm:text-base md:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
                  >
                    For Service Providers
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  <CheckCircle className="inline h-4 w-4 mr-1 text-primary" />
                  Free for homeowners forever · No credit card required
                </p>
              </div>
            </div>
            <div className="relative animate-fade-in">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl rounded-full"></div>
              <img 
                src={heroProviderImage} 
                alt="Professional HomeBase service provider with equipment ready to provide quality home maintenance services" 
                loading="lazy"
                className="rounded-2xl shadow-2xl w-full relative z-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-12 px-4 bg-muted/30 border-b border-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-3 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Bank-Level Security</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">10x Faster Booking</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Verified Professionals</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why AI Matters Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">The HomeBase Difference</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Without HomeBase vs. With HomeBase</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how HomeBase eliminates the stress and busywork of home management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Without HomeBase */}
            <Card className="p-6 border-2 border-destructive/20 bg-destructive/5">
              <h3 className="text-xl font-semibold mb-4 text-destructive">Without HomeBase</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-muted-foreground">Forgotten maintenance appointments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-muted-foreground">Hours spent researching providers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-muted-foreground">Endless texts and missed calls</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-muted-foreground">Unexpected breakdowns and repairs</span>
                </li>
              </ul>
            </Card>

            {/* With HomeBase */}
            <Card className="p-6 border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl"></div>
              <h3 className="text-xl font-semibold mb-4 text-primary relative z-10">With HomeBase</h3>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">Everything scheduled and handled for you</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">Perfect provider match in seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">All jobs and payments in one place</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">Maintenance before problems happen</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works - Unified */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Simple solutions for homeowners and service providers
          </p>
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Homeowners Column */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center mb-6">For Homeowners</h3>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Home className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Tell Us About Your Home</h4>
                    <p className="text-muted-foreground text-sm">HomeBase understands your maintenance needs instantly</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Handshake className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Get Matched With Trusted Pros</h4>
                    <p className="text-muted-foreground text-sm">We connect you with the perfect provider in seconds</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Relax. We Handle Everything</h4>
                    <p className="text-muted-foreground text-sm">Scheduling, reminders, and communication—all automated</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Providers Column */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center mb-6">For Service Providers</h3>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Create Your Professional Profile</h4>
                    <p className="text-muted-foreground text-sm">Stand out with a profile designed to win clients</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Get Connected With Perfect Clients</h4>
                    <p className="text-muted-foreground text-sm">Smart matching fills your calendar with ideal jobs</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Run Your Business Effortlessly</h4>
                    <p className="text-muted-foreground text-sm">Automated scheduling, billing, and client communication</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features - Unified */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need in One Place</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Powerful features that save you time and money
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Never Miss Maintenance</h3>
              <p className="text-muted-foreground">
                Get reminders before issues become expensive problems
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Help 24/7</h3>
              <p className="text-muted-foreground">
                Chat with HomeBase anytime—schedule services, ask questions, get quotes
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Smarter Scheduling</h3>
              <p className="text-muted-foreground">
                Optimized timing and routing saves time and maximizes efficiency
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Perfect Provider Matching</h3>
              <p className="text-muted-foreground">
                Matched with verified pros based on your needs, location, and reviews
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Transparent Pricing</h3>
              <p className="text-muted-foreground">
                See accurate estimates upfront—no surprises, no guesswork
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Grow Your Revenue</h3>
              <p className="text-muted-foreground">
                Built-in tools help providers win more jobs and get paid faster
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">See It in Action</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Simple, beautiful apps designed for real people—not tech experts
          </p>
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">For Homeowners</h3>
                <p className="text-muted-foreground mb-4">
                  Manage your entire home from your phone. Track appointments, pay securely, and communicate with pros—all in one place.
                </p>
                <Button onClick={() => navigate("/demo/homeowner")} variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  See Homeowner Demo
                </Button>
              </div>
              <img 
                src={homeownerMockup} 
                alt="HomeBase mobile app interface showing homeowner dashboard for managing home services and subscriptions" 
                loading="lazy"
                className="rounded-lg shadow-2xl mx-auto"
              />
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">For Service Providers</h3>
                <p className="text-muted-foreground mb-4">
                  Everything you need to run your business. Manage clients, send quotes, track payments, and schedule jobs—all from your phone.
                </p>
                <Button onClick={() => navigate("/demo/provider")} variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  See Provider Demo
                </Button>
              </div>
              <img 
                src={providerMockup} 
                alt="HomeBase provider dashboard showing service management tools for home service professionals" 
                loading="lazy"
                className="rounded-lg shadow-2xl mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Social Proof Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Built on Trust. Designed for Real People.</h2>
            <p className="text-lg text-primary-foreground/90 mb-12">
              HomeBase combines security, simplicity, and reliability—so you can manage your home or business with confidence
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Verified Professionals</h3>
                <p className="text-primary-foreground/80 text-sm">
                  Every provider is screened and verified before joining the platform
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                  <Lock className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Secure Payments</h3>
                <p className="text-primary-foreground/80 text-sm">
                  Bank-level encryption protects every transaction on the platform
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                  <Star className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Real Reviews</h3>
                <p className="text-primary-foreground/80 text-sm">
                  Authentic feedback from real customers helps you make informed decisions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-4">Frequently Asked Questions</h2>
          <p className="text-center text-muted-foreground mb-12">
            Everything you need to know about HomeBase
          </p>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-t border-border">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Home className="h-4 w-4" />
            <span className="text-sm font-medium">Ready to Simplify Your Life?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Work smarter. Live easier.<br />Stress less.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of homeowners and service providers who trust HomeBase to handle the busywork—so they can focus on what matters
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button 
              size="lg" 
              onClick={() => navigate("/register")}
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Start Free
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/demo/homeowner")}
              className="text-lg px-8 py-6"
            >
              <Play className="h-5 w-5 mr-2" />
              See How It Works
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Free for homeowners forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>5-star support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/demo/homeowner")} className="hover:text-foreground transition-colors">For Homeowners</button></li>
                <li><button onClick={() => navigate("/demo/provider")} className="hover:text-foreground transition-colors">For Providers</button></li>
                <li><button onClick={() => navigate("/pricing")} className="hover:text-foreground transition-colors">Pricing</button></li>
                <li><button onClick={() => navigate("/club")} className="hover:text-foreground transition-colors">Referral Program</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Press Kit</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Trust</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={homebaseLogo} alt="HomeBase" className="h-6 w-6" />
              <span className="font-semibold">HomeBase</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Built in Dallas, TX · <a href="mailto:support@homebaseproapp.com" className="hover:text-foreground transition-colors">support@homebaseproapp.com</a> · © 2024 HomeBase. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="https://x.com/homebaseproapp" target="_blank" rel="noopener noreferrer" aria-label="X (formerly Twitter)" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://facebook.com/homebaseproapp" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://instagram.com/homebaseproapp" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://linkedin.com/company/homebaseproapp" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
