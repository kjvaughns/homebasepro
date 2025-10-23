import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import homebaseLogo from "@/assets/homebase-logo.png";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { SectionHeader } from "@/components/resources/SectionHeader";
import { Home, MessageSquare, Calendar, CheckCircle, Wrench, MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Resources() {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "Are these tools really free?",
      answer: "Yes! All our resource tools are completely free to use with no login required. We believe in providing value upfront to help you make informed decisions about your home care needs.",
    },
    {
      question: "Do I need to create an account to use these tools?",
      answer: "No account needed to use the tools. However, creating a free HomeBase account lets you save your plans, get reminders, and access additional features like booking trusted providers.",
    },
    {
      question: "Can I export my maintenance plan?",
      answer: "Absolutely! You can download your personalized maintenance plan as a PDF or CSV file, and share it via a link with family members or service providers.",
    },
    {
      question: "How accurate are the cost estimates?",
      answer: "Our estimates are based on regional pricing data and industry averages. We provide a range (low, typical, high) to give you realistic expectations. Actual costs may vary based on your specific circumstances.",
    },
    {
      question: "Will my information be shared?",
      answer: "Your privacy matters. We don't store your inputs unless you create an account and save your results. No information is shared with third parties.",
    },
    {
      question: "Can I use these tools if I'm a service provider?",
      answer: "Yes! The Smart Estimate & Communication Builder is specifically designed for service providers. Use it to standardize your client communication and reduce no-shows.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
              <span className="text-2xl font-bold text-foreground">HomeBase</span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => navigate("/")} 
                variant="ghost" 
                size="sm"
              >
                Home
              </Button>
              <Button 
                onClick={() => navigate("/pricing")} 
                variant="ghost" 
                size="sm"
              >
                Pricing
              </Button>
              <Button 
                onClick={() => navigate("/register")} 
                size="sm"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="container mx-auto relative z-10 max-w-5xl">
          <div className="text-center space-y-6">
            <SectionHeader
              eyebrow="Free Tools"
              title="Resources to simplify home care and service ops"
              subtitle="Plan maintenance, estimate costs, and standardize client communication—no login required."
            />
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => {
                  const toolsSection = document.getElementById('tools-section');
                  toolsSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                data-track="resources_open"
              >
                Open Resources
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/register")}
              >
                Create a Free Account
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools-section" className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <ResourceCard
              icon={<Home className="h-8 w-8 text-primary" />}
              title="Home Maintenance Survival Kit"
              description="Personalized yearly maintenance plan + cost projection based on your home."
              ctaText="Open Survival Kit"
              ctaLink="/resources/home-maintenance-survival-kit"
              trackingId="resources_card_click_hmsk"
            />
            
            <ResourceCard
              icon={<MessageSquare className="h-8 w-8 text-primary" />}
              title="Smart Estimate & Communication Builder"
              description="Generate clear estimates and client‑ready messages for fewer no‑shows and disputes."
              ctaText="Build My Estimate Pack"
              ctaLink="/resources/provider-communication-builder"
              trackingId="resources_card_click_pcb"
            />
          </div>
        </div>
      </section>

      {/* Explainer Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <SectionHeader
            title="How HomeBase Works"
            subtitle="Prefer everything automated?"
          />
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Plan</h3>
              <p className="text-muted-foreground">Build your maintenance schedule with smart recommendations</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Book</h3>
              <p className="text-muted-foreground">Connect with trusted local service providers</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Track</h3>
              <p className="text-muted-foreground">Manage all home services in one place</p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Button 
              size="lg"
              onClick={() => navigate("/register")}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <SectionHeader
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about our free tools"
          />
          
          <Accordion type="single" collapsible className="mt-12">
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

      {/* Footer CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to simplify your home care?</h2>
          <p className="text-lg text-primary-foreground/90">
            Join HomeBase to automate maintenance tracking, booking, and payments
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate("/register")}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={() => navigate("/become-provider")}
            >
              For Providers: Get bookings with HomeBase
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
                <span className="text-xl font-bold">HomeBase</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Simplifying home service management for everyone
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => navigate("/resources/home-maintenance-survival-kit")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Home Maintenance Survival Kit
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/resources/provider-communication-builder")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Smart Estimate Builder
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => navigate("/pricing")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/club")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Referrals
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => navigate("/privacy")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/terms")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms & Conditions
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} HomeBase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
