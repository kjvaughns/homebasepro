import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import homebaseLogo from "@/assets/homebase-logo.png";

const Terms = () => {
  const navigate = useNavigate();

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
                className="h-9 text-sm px-4"
              >
                Home
              </Button>
              <Button 
                onClick={() => navigate("/register")} 
                size="sm" 
                className="h-9 text-sm px-4 whitespace-nowrap"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-foreground">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using HomeBase ("the Service"), you accept and agree to be bound by the terms 
              and provisions of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              HomeBase is a platform that connects homeowners with service providers for home maintenance and 
              related services through subscription-based plans. The Service includes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Service provider marketplace and discovery</li>
              <li>Subscription management and billing</li>
              <li>Appointment scheduling and tracking</li>
              <li>Communication tools between homeowners and providers</li>
              <li>Payment processing and invoicing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. User Accounts</h2>
            <p className="text-muted-foreground mb-4">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. User Responsibilities</h2>
            <p className="text-muted-foreground mb-4">As a user of HomeBase, you agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful or malicious code</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service for any fraudulent purpose</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Service Provider Terms</h2>
            <p className="text-muted-foreground mb-4">
              If you are a service provider, you additionally agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintain all required licenses and insurance</li>
              <li>Provide services professionally and competently</li>
              <li>Honor subscriptions and service commitments</li>
              <li>Respond to customer inquiries in a timely manner</li>
              <li>Comply with all applicable service standards</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Payments and Subscriptions</h2>
            <p className="text-muted-foreground mb-4">
              By subscribing to services through HomeBase, you agree that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Subscriptions are billed on a recurring basis unless canceled</li>
              <li>You authorize us to charge your payment method for subscription fees</li>
              <li>Refund policies are determined by individual service providers</li>
              <li>We may change fees with reasonable notice</li>
              <li>You are responsible for any taxes or fees</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Cancellation and Termination</h2>
            <p className="text-muted-foreground">
              You may cancel your subscriptions at any time through your account settings. We reserve the right 
              to suspend or terminate your access to the Service for violations of these terms or for any other 
              reason at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              The Service is provided "as is" without warranties of any kind. HomeBase acts as a platform to 
              connect users and does not guarantee the quality, safety, or legality of services provided by 
              service providers. We are not responsible for disputes between homeowners and service providers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the fullest extent permitted by law, HomeBase shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages arising out of or related to your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold HomeBase harmless from any claims, damages, losses, or expenses 
              arising from your use of the Service or violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">11. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of the Service are owned by HomeBase and are protected 
              by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify users of material changes. 
              Your continued use of the Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms shall be governed by and construed in accordance with the laws of the jurisdiction 
              in which HomeBase operates, without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">14. Contact Information</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms & Conditions, please contact us at:{" "}
              <a href="mailto:legal@homebase.app" className="text-primary hover:underline">
                legal@homebase.app
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center gap-6 mb-4">
            <button 
              onClick={() => navigate("/privacy")} 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => navigate("/terms")} 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms & Conditions
            </button>
          </div>
          <p className="text-muted-foreground">&copy; 2025 HomeBase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
