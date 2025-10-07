import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Calendar, Shield, CreditCard, CheckCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">HomeBase</span>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/pricing")} variant="ghost">
              Pricing
            </Button>
            <Button onClick={() => navigate("/signup")} variant="outline">
              Sign Up
            </Button>
            <Button onClick={() => navigate("/auth")} variant="ghost">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Never forget maintenance again
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            HomeBase connects homeowners with trusted service providers through maintenance subscriptions. 
            Manage all your home services in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/signup")}
              className="text-lg px-8"
            >
              For Homeowners
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/signup")}
              className="text-lg px-8"
            >
              For Service Providers
            </Button>
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

      {/* Features for Providers */}
      <section className="py-20 px-4 bg-muted/50">
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
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-muted-foreground">
                Manage appointments, routes, and technician schedules efficiently
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of homeowners and service providers using HomeBase
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/signup")}
              className="text-lg px-8"
            >
              Get Started as Homeowner
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/signup")}
              className="text-lg px-8"
            >
              Get Started as Provider
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
