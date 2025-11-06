import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Calendar, Shield, CreditCard, CheckCircle, Users, Star, TrendingUp, Sparkles, Brain, Zap, Award, Lock, Clock } from "lucide-react";
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
      question: "How does HomeBase AI work?",
      answer: "HomeBase uses advanced AI to analyze your home's needs, match you with the perfect service providers, predict maintenance schedules, and automate your entire home management experience. Our AI learns from millions of data points to give you smarter recommendations every day.",
    },
    {
      question: "Is my data safe with AI?",
      answer: "Absolutely. We use bank-level encryption and never share your personal data. Our AI processes information locally and securely, ensuring your privacy is always protected. We're compliant with all major security standards.",
    },
    {
      question: "What types of services are available?",
      answer: "Our AI connects you with verified providers for HVAC, plumbing, electrical, landscaping, pool care, pest control, and more. The AI matches you based on your home's specific needs, location, and preferences.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes! Most plans are month-to-month with no long-term contracts. Cancel anytime through your account settings. Our AI will help you transition smoothly.",
    },
    {
      question: "How does AI improve my experience?",
      answer: "AI predicts when maintenance is needed before issues arise, automatically schedules appointments at optimal times, finds the best providers for your specific needs, and learns your preferences to make every interaction smarter.",
    },
    {
      question: "What makes HomeBase different from other platforms?",
      answer: "We're the only AI-powered home management platform that combines predictive maintenance, smart scheduling, automated operations, and verified provider matching all in one place. Our AI does the thinking so you don't have to.",
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
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">AI-Powered Platform</span>
              </div>
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
                onClick={() => navigate("/club")} 
                variant="ghost" 
                size="sm" 
                className="h-9 text-sm px-4"
              >
                Referrals
              </Button>
              <Button 
                onClick={() => navigate("/demo/homeowner")} 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm px-4 whitespace-nowrap"
              >
                <Bot className="h-4 w-4 mr-2" />
                Try AI Demo
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
            Free AI tools for homeowners · Provider plans with AI automation
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

        <div className="container mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full mb-6 animate-fade-in border border-primary/20">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium">The AI Powered Home Management Platform</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground animate-fade-in">
                Your home. <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Smarter.</span> Managed by AI. Trusted by pros.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in">
                AI matches you with verified providers, predicts maintenance before issues arise, and automates your entire home management experience.
              </p>
              <div className="flex flex-col gap-4 items-center md:items-start animate-fade-in">
                <div className="flex gap-3">
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/demo/homeowner")}
                    className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    <Bot className="h-5 w-5 mr-2" />
                    See AI in Action
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate("/register")}
                    className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6"
                  >
                    Start Free Trial
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
              <p className="text-sm font-medium text-foreground">AI-Verified Providers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why AI Matters Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">Powered by Intelligence</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why AI Changes Everything</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop managing your home manually. Let AI handle the complexity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Without AI */}
            <Card className="p-6 border-2 border-destructive/20 bg-destructive/5">
              <h3 className="text-xl font-semibold mb-4 text-destructive">Without AI</h3>
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
                  <span className="text-muted-foreground">Manual scheduling and follow-ups</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-muted-foreground">Unexpected breakdowns and repairs</span>
                </li>
              </ul>
            </Card>

            {/* With HomeBase AI */}
            <Card className="p-6 border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl"></div>
              <h3 className="text-xl font-semibold mb-4 text-primary relative z-10">With HomeBase AI</h3>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">AI predicts & auto-schedules maintenance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">Perfect provider match in seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">Fully automated operations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">Prevent issues before they happen</span>
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
            AI-powered simplicity for homeowners and service providers
          </p>
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Homeowners Column */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center mb-6">For Homeowners</h3>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Tell AI About Your Home</h4>
                    <p className="text-muted-foreground text-sm">AI instantly understands your maintenance needs</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">AI Matches You With Pros</h4>
                    <p className="text-muted-foreground text-sm">Perfect provider match in seconds</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Relax. AI Handles Everything</h4>
                    <p className="text-muted-foreground text-sm">Automated scheduling and management</p>
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
                    <h4 className="text-lg font-semibold mb-1">AI Builds Your Brand</h4>
                    <p className="text-muted-foreground text-sm">Optimized profile to attract the right clients</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">AI Finds Perfect Clients</h4>
                    <p className="text-muted-foreground text-sm">Smart matching fills your calendar</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-2 hover:border-primary transition-all">
                <div className="flex gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">AI Manages Operations</h4>
                    <p className="text-muted-foreground text-sm">Automated scheduling, billing, and communication</p>
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
          <h2 className="text-3xl font-bold text-center mb-4">AI-Powered Features</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Intelligent automation for everyone
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Powered</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Predictive Maintenance</h3>
              <p className="text-muted-foreground">
                AI predicts needs before problems arise, saving time and money
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Powered</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7 AI Assistant</h3>
              <p className="text-muted-foreground">
                Get instant answers, schedule services, and manage everything via chat
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Powered</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-muted-foreground">
                Optimized routes and timing maximize efficiency for providers
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Powered</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Perfect Matching</h3>
              <p className="text-muted-foreground">
                AI connects homeowners with ideal providers based on needs and history
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Powered</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Cost Forecasting</h3>
              <p className="text-muted-foreground">
                Accurate budget predictions and dynamic pricing optimization
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Powered</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Revenue Optimization</h3>
              <p className="text-muted-foreground">
                AI-driven insights and recommendations to maximize earnings
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Experience the Platform</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Beautiful, intuitive apps designed for both homeowners and service providers
          </p>
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">For Homeowners</h3>
                <p className="text-muted-foreground mb-4">
                  Manage your entire home from your phone. Subscribe to services, track appointments, and communicate with providers effortlessly.
                </p>
                <Button onClick={() => navigate("/demo/homeowner")} variant="outline">
                  <Bot className="h-4 w-4 mr-2" />
                  Try Homeowner Demo
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
                  Powerful tools to manage clients, subscriptions, scheduling, and payments. Everything you need to scale your business.
                </p>
                <Button onClick={() => navigate("/demo/provider")} variant="outline">
                  <Bot className="h-4 w-4 mr-2" />
                  Try Provider Demo
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
            <h2 className="text-3xl font-bold mb-4">Built on Trust. Powered by Intelligence.</h2>
            <p className="text-lg text-primary-foreground/90 mb-12">
              HomeBase combines cutting-edge AI technology with the security and reliability you expect
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">AI-Verified Providers</h3>
                <p className="text-primary-foreground/80 text-sm">
                  Every provider is screened and verified by our AI system before joining
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
            Everything you need to know about HomeBase AI
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
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Ready to Experience AI-Powered Home Management?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Stop managing your home manually.<br />Let AI do it for you.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of homeowners and hundreds of service providers who trust HomeBase AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button 
              size="lg" 
              onClick={() => navigate("/register")}
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/demo/homeowner")}
              className="text-lg px-8 py-6"
            >
              <Bot className="h-5 w-5 mr-2" />
              Watch AI Demo
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
              Built in Dallas, TX · © 2024 HomeBase. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
