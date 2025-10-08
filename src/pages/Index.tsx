import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Calendar, Shield, CreditCard, CheckCircle, Users, Star, TrendingUp, Clock, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import homebaseLogo from "@/assets/homebase-logo.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  const navigate = useNavigate();

  const testimonials = [
    {
      quote: "This is exactly what I've been looking for to manage my home maintenance subscriptions.",
      author: "Early Access User",
      role: "Homeowner (Beta Tester)",
    },
    {
      quote: "The subscription model is perfect for my HVAC business. Can't wait to get started.",
      author: "Beta Participant",
      role: "HVAC Provider",
    },
    {
      quote: "Finally, a platform that makes recurring billing and scheduling simple.",
      author: "Early Adopter",
      role: "Service Provider",
    },
  ];

  const faqs = [
    {
      question: "How does HomeBase work?",
      answer: "HomeBase connects homeowners with trusted service providers through subscription-based maintenance plans. Simply browse providers, subscribe to plans that fit your needs, and manage everything through our platform.",
    },
    {
      question: "What types of services are available?",
      answer: "We offer a wide range of home services including HVAC maintenance, plumbing, electrical, landscaping, pool care, pest control, and more. Service providers create custom maintenance plans for their specific services.",
    },
    {
      question: "Is there a contract or can I cancel anytime?",
      answer: "Most plans are month-to-month with no long-term contracts required. You can cancel anytime through your account settings.",
    },
    {
      question: "How do payments work?",
      answer: "All payments are processed securely through our platform. Set up automatic payments and never worry about missing a service payment again.",
    },
    {
      question: "What if I'm not satisfied with a service?",
      answer: "We work with verified, trusted providers and encourage open communication. If you have any issues, you can message your provider directly through the app or contact our support team.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
            <span className="text-2xl font-bold text-foreground">HomeBase</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button onClick={() => navigate("/pricing")} variant="ghost" size="sm" className="sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
              Pricing
            </Button>
            <Button onClick={() => navigate("/waitlist")} size="sm" className="sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
              Join Waitlist
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full mb-6 animate-fade-in">
            <Star className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">🎉 Early Access: Lifetime 25% Discount for Beta Users</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground animate-fade-in">
            Never forget maintenance again
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in px-4">
            HomeBase connects homeowners with trusted service providers through maintenance subscriptions. 
            Manage all your home services in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in px-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/waitlist")}
              className="text-base sm:text-lg px-6 sm:px-12 py-5 sm:py-6 w-full sm:w-auto"
            >
              Join the Waitlist
            </Button>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Redefining Home Service Management
            </h2>
            <p className="text-base sm:text-lg text-primary-foreground/90 mb-8">
              Join hundreds of early adopters who are ready to transform how home services work
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <div className="animate-fade-in">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-6 sm:h-8 w-6 sm:w-8 mr-2" />
                </div>
                <p className="text-sm sm:text-base text-primary-foreground/80">Homeowners Ready</p>
              </div>
              <div className="animate-fade-in">
                <div className="flex items-center justify-center mb-2">
                  <Award className="h-6 sm:h-8 w-6 sm:w-8 mr-2" />
                </div>
                <p className="text-sm sm:text-base text-primary-foreground/80">Service Providers</p>
              </div>
              <div className="animate-fade-in">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-6 sm:h-8 w-6 sm:w-8 mr-2" />
                </div>
                <p className="text-sm sm:text-base text-primary-foreground/80">Built for Scale</p>
              </div>
              <div className="animate-fade-in">
                <div className="flex items-center justify-center mb-2">
                  <Star className="h-6 sm:h-8 w-6 sm:w-8 mr-2" />
                </div>
                <p className="text-sm sm:text-base text-primary-foreground/80">Early Access Perks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Homeowners */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works for Homeowners</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Three simple steps to never worry about home maintenance again
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-6 text-center border-2 hover:border-primary transition-colors">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="h-8 w-8 text-primary" />
              </div>
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Add Your Home</h3>
              <p className="text-muted-foreground">
                Register your property with key details to help providers give you accurate service
              </p>
            </Card>
            <Card className="p-6 text-center border-2 hover:border-primary transition-colors">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Browse Providers</h3>
              <p className="text-muted-foreground">
                Find trusted local service providers and compare maintenance plans
              </p>
            </Card>
            <Card className="p-6 text-center border-2 hover:border-primary transition-colors">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Subscribe & Relax</h3>
              <p className="text-muted-foreground">
                Subscribe to plans and let your providers handle the rest automatically
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features for Homeowners */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">For Homeowners</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Manage all your home services, payments, and maintenance history in one beautiful app
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-6 border-2 hover:border-primary transition-colors">
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Easy Scheduling</h3>
              <p className="text-muted-foreground">
                Book appointments with your service providers and track upcoming visits
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Maintenance Plans</h3>
              <p className="text-muted-foreground">
                Subscribe to maintenance plans and never worry about scheduling routine services
              </p>
            </Card>
            <Card className="p-6 border-2 hover:border-primary transition-colors">
              <CreditCard className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Simple Payments</h3>
              <p className="text-muted-foreground">
                Manage all your service payments and invoices in one secure location
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works - Providers */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works for Providers</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Build recurring revenue and grow your business in three simple steps
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-6 text-center border-2 hover:border-primary transition-colors">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-accent" />
              </div>
              <div className="bg-accent text-accent-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Profile</h3>
              <p className="text-muted-foreground">
                Set up your business profile and showcase your services
              </p>
            </Card>
            <Card className="p-6 text-center border-2 hover:border-primary transition-colors">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-accent" />
              </div>
              <div className="bg-accent text-accent-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Add Plans</h3>
              <p className="text-muted-foreground">
                Create maintenance subscription plans tailored to your services
              </p>
            </Card>
            <Card className="p-6 text-center border-2 hover:border-primary transition-colors">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
              <div className="bg-accent text-accent-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Clients</h3>
              <p className="text-muted-foreground">
                Start receiving subscriptions and build predictable revenue
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features for Providers */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">For Service Providers</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Grow your business with subscriptions and manage customers effortlessly
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-6 bg-card border-2 hover:border-primary transition-colors">
              <CheckCircle className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Recurring Revenue</h3>
              <p className="text-muted-foreground">
                Create subscription plans and generate predictable monthly income
              </p>
            </Card>
            <Card className="p-6 bg-card border-2 hover:border-primary transition-colors">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Customer Portal</h3>
              <p className="text-muted-foreground">
                Give your customers a branded portal to manage their services
              </p>
            </Card>
            <Card className="p-6 bg-card border-2 hover:border-primary transition-colors">
              <Clock className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-muted-foreground">
                Manage appointments, routes, and technician schedules efficiently
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">What Early Adopters Are Saying</h2>
          <p className="text-center text-muted-foreground mb-12">
            Feedback from beta testers shaping the future of HomeBase
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-primary">
                      {testimonial.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Modern, Mobile-First Interface</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Beautiful, intuitive apps designed for homeowners and service providers
          </p>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="p-6 overflow-hidden">
              <img 
                src="/src/assets/homeowner-mobile-mockup.png" 
                alt="Homeowner Mobile App" 
                className="w-full h-auto rounded-lg shadow-lg mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">Homeowner App</h3>
              <p className="text-muted-foreground">
                Manage your home services, schedule appointments, and track maintenance history - all from your phone
              </p>
            </Card>
            <Card className="p-6 overflow-hidden">
              <img 
                src="/src/assets/provider-dashboard-mockup.png" 
                alt="Provider Dashboard" 
                className="w-full h-auto rounded-lg shadow-lg mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">Provider Dashboard</h3>
              <p className="text-muted-foreground">
                Professional dashboard to manage clients, track appointments, and grow your recurring revenue
              </p>
            </Card>
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
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 px-4">
            Join the waitlist and secure your lifetime 25% discount
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/waitlist")}
              className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
            >
              Join Waitlist Now
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/pricing")}
              className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 HomeBase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
