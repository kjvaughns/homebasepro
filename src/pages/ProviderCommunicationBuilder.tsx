import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import homebaseLogo from "@/assets/homebase-logo.png";
import { SectionHeader } from "@/components/resources/SectionHeader";
import { ResultPanel } from "@/components/resources/ResultPanel";
import { DownloadButtons } from "@/components/resources/DownloadButtons";
import { StickyFooterCTA } from "@/components/resources/StickyFooterCTA";
import { toast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { generateCommunicationPackPDF } from "@/utils/generatePDF";

interface CommunicationPack {
  estimate: {
    lineItems: Array<{ description: string; price: string }>;
    total: string;
    disclaimers: string[];
  };
  messages: {
    confirmation: string;
    onTheWay: string;
    inProgress: string;
    postJob: string;
    reviewRequest: string;
  };
  policies: {
    cancellation: string;
    reschedule: string;
    payment: string;
  };
}

export default function ProviderCommunicationBuilder() {
  const navigate = useNavigate();
  const [generatedPack, setGeneratedPack] = useState<CommunicationPack | null>(null);
  
  // Form state
  const [serviceCategory, setServiceCategory] = useState("");
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [pricingModel, setPricingModel] = useState("");
  const [travelFee, setTravelFee] = useState("");
  const [diagnosticFee, setDiagnosticFee] = useState("");
  const [inclusions, setInclusions] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [sendOnTheWay, setSendOnTheWay] = useState(true);
  const [sendInProgress, setSendInProgress] = useState(false);
  const [sendPostJob, setSendPostJob] = useState(true);
  const [sendReview, setSendReview] = useState(true);
  const [preferredChannels, setPreferredChannels] = useState<string[]>(["SMS", "Email"]);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [replyEmail, setReplyEmail] = useState("");

  const categoryJobTypes: { [key: string]: string[] } = {
    "HVAC": ["Tune-up", "Filter replacement", "Duct cleaning", "Emergency repair"],
    "Plumbing": ["Drain unclog", "Water heater service", "Leak repair", "Fixture install"],
    "Electrical": ["Panel upgrade", "Outlet install", "Lighting install", "Safety inspection"],
    "Cleaning": ["Standard clean", "Deep clean", "Move-in/out", "Post-construction"],
    "Lawn": ["Mowing & edging", "Fertilization", "Aeration", "Seasonal cleanup"],
    "Roofing": ["Inspection", "Leak repair", "Replacement", "Maintenance"],
    "Pest": ["General treatment", "Termite inspection", "Rodent control", "Prevention plan"],
    "Pool": ["Weekly service", "Chemical balance", "Equipment repair", "Opening/closing"],
    "Handyman": ["General repairs", "Assembly", "Minor installations", "Maintenance"],
  };

  const generatePack = () => {
    const categoryDefaults: { [key: string]: any } = {
      "HVAC": {
        inclusions: "Visual inspection, filter check, thermostat calibration, refrigerant level check",
        exclusions: "Parts, refrigerant top-up, ductwork modification, electrical repairs",
        samplePrice: "$150-250",
      },
      "Plumbing": {
        inclusions: "Initial assessment, basic diagnosis, labor for standard repair",
        exclusions: "Parts, permit fees, wall/floor opening, restoration work",
        samplePrice: "$120-180",
      },
      "Cleaning": {
        inclusions: "Dusting, vacuuming, mopping, bathroom/kitchen sanitization",
        exclusions: "Laundry, dishes, inside appliances, exterior windows, carpet steam cleaning",
        samplePrice: "$100-150",
      },
    };

    const defaults = categoryDefaults[serviceCategory] || {
      inclusions: "Standard service items",
      exclusions: "Additional materials and permits",
      samplePrice: "$100-200",
    };

    // Generate estimate template
    const estimate = {
      lineItems: [
        { description: `${serviceCategory} Service - ${jobTypes[0] || "Standard Job"}`, price: defaults.samplePrice },
        travelFee ? { description: "Travel/Service Call Fee", price: `$${travelFee}` } : null,
        diagnosticFee ? { description: "Diagnostic Fee", price: `$${diagnosticFee}` } : null,
      ].filter(Boolean) as Array<{ description: string; price: string }>,
      total: pricingModel === "Flat" ? defaults.samplePrice : "Based on scope",
      disclaimers: [
        "This estimate is valid for 30 days",
        `Pricing ${pricingModel === "Flat" ? "is fixed" : "may vary based on actual work performed"}`,
        "Additional charges may apply for parts and materials",
        inclusions || defaults.inclusions,
      ],
    };

    // Generate message templates
    const messages = {
      confirmation: sendConfirmation
        ? `Hi! This is ${businessName || "[Your Business]"}. We've confirmed your appointment for [DATE] between [TIME WINDOW]. ${
            phone ? `Questions? Call/text us at ${phone}.` : ""
          } Please ensure [prep notes based on service]. See you soon!`
        : "",
      onTheWay: sendOnTheWay
        ? `Good news! Your ${serviceCategory} technician is on the way and will arrive in approximately [ETA] minutes. Track their arrival: [LIVE ETA LINK]. ${
            phone ? `Questions? ${phone}` : ""
          }`
        : "",
      inProgress: sendInProgress
        ? `Update: We're currently working on your ${
            jobTypes[0] || "service"
          }. [OPTIONAL PHOTO]. Estimated completion in [TIME]. We'll notify you when finished.`
        : "",
      postJob: sendPostJob
        ? `All done! Your ${jobTypes[0] || "service"} is complete. Work performed: [WORK SUMMARY]. Warranty info: [WARRANTY DETAILS]. Next recommended service: [NEXT STEPS]. Invoice: [LINK]. ${
            replyEmail ? `Questions? Reply here or email ${replyEmail}` : ""
          }`
        : "",
      reviewRequest: sendReview
        ? `Thank you for choosing ${businessName || "[Your Business]"}! We'd love to hear about your experience. Could you take 30 seconds to leave us a review? [REVIEW LINK]. Your feedback helps us serve you better!`
        : "",
    };

    // Generate policy snippets
    const policies = {
      cancellation: `Cancellation Policy: Cancel or reschedule at least 24 hours before your appointment to avoid a cancellation fee. Same-day cancellations may be subject to a ${
        travelFee || "$50"
      } fee.`,
      reschedule: `Reschedule Policy: We're happy to reschedule! Contact us at least 24 hours in advance. ${
        phone ? `Call/text ${phone}` : "Contact us"
      } or reply to your confirmation message.`,
      payment: `Payment Terms: Payment is due upon completion. We accept cash, check, and all major credit cards. Net-30 terms available for approved commercial accounts.`,
    };

    const pack: CommunicationPack = { estimate, messages, policies };
    setGeneratedPack(pack);

    // Save to localStorage
    localStorage.setItem("providerCommunicationPack", JSON.stringify(pack));

    toast({
      title: "Pack Generated!",
      description: "Your communication pack is ready to use",
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied!`,
      description: "Text copied to clipboard",
    });
  };

  const handleDownloadPDF = async () => {
    if (!generatedPack) return;
    
    toast({
      title: "Generating PDF...",
      description: "This may take a moment",
    });
    
    try {
      // Convert the data to match the expected interface
      const packForPDF = {
        estimate: {
          items: generatedPack.estimate.lineItems.map((item, index) => ({
            description: item.description,
            quantity: 1,
            rate: parseFloat(item.price.replace(/[^0-9.]/g, '')),
            total: parseFloat(item.price.replace(/[^0-9.]/g, '')),
          })),
          subtotal: parseFloat(generatedPack.estimate.total.replace(/[^0-9.]/g, '')),
          tax: 0,
          total: parseFloat(generatedPack.estimate.total.replace(/[^0-9.]/g, '')),
        },
        messages: generatedPack.messages,
        policies: generatedPack.policies,
      };

      await generateCommunicationPackPDF(packForPDF, {
        businessName,
        phone,
        email: replyEmail,
      });
      
      toast({
        title: "PDF Downloaded!",
        description: "Your communication pack is ready",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
              <span className="text-2xl font-bold">HomeBase</span>
            </div>
            <Button onClick={() => navigate("/resources")} variant="ghost" size="sm">
              ← Back to Resources
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero */}
        <div className="mb-12">
          <SectionHeader
            title="Crystal‑clear estimates. Hassle‑free client updates."
            subtitle="Standardize your scope, pricing notes, and message flow in minutes."
          />
        </div>

        {!generatedPack ? (
          // Form
          <Card className="p-6 md:p-8 rounded-2xl shadow-md">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generatePack();
              }}
              className="space-y-8"
            >
              {/* Service Details */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Service Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="serviceCategory">Service Category</Label>
                  <Select value={serviceCategory} onValueChange={setServiceCategory} required>
                    <SelectTrigger id="serviceCategory">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="Cleaning">Cleaning</SelectItem>
                      <SelectItem value="Lawn">Lawn Care</SelectItem>
                      <SelectItem value="Roofing">Roofing</SelectItem>
                      <SelectItem value="Pest">Pest Control</SelectItem>
                      <SelectItem value="Pool">Pool Service</SelectItem>
                      <SelectItem value="Handyman">Handyman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {serviceCategory && (
                  <div className="space-y-2">
                    <Label>Typical Job Types (select all that apply)</Label>
                    <div className="flex flex-wrap gap-2">
                      {categoryJobTypes[serviceCategory]?.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            if (jobTypes.includes(type)) {
                              setJobTypes(jobTypes.filter((t) => t !== type));
                            } else {
                              setJobTypes([...jobTypes, type]);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            jobTypes.includes(type)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="pricingModel">Pricing Model</Label>
                  <Select value={pricingModel} onValueChange={setPricingModel} required>
                    <SelectTrigger id="pricingModel">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Flat">Flat Rate</SelectItem>
                      <SelectItem value="Hourly">Hourly</SelectItem>
                      <SelectItem value="Tiered">Tiered/Package</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="travelFee">Travel/Service Call Fee (optional)</Label>
                    <Input
                      id="travelFee"
                      type="number"
                      value={travelFee}
                      onChange={(e) => setTravelFee(e.target.value)}
                      placeholder="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diagnosticFee">Diagnostic Fee (optional)</Label>
                    <Input
                      id="diagnosticFee"
                      type="number"
                      value={diagnosticFee}
                      onChange={(e) => setDiagnosticFee(e.target.value)}
                      placeholder="75"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inclusions">Standard Inclusions</Label>
                  <Textarea
                    id="inclusions"
                    value={inclusions}
                    onChange={(e) => setInclusions(e.target.value)}
                    placeholder="What's included in your standard service..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exclusions">Standard Exclusions</Label>
                  <Textarea
                    id="exclusions"
                    value={exclusions}
                    onChange={(e) => setExclusions(e.target.value)}
                    placeholder="What's NOT included (parts, permits, etc)..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Communication Steps */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Communication Steps</h3>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirmation"
                      checked={sendConfirmation}
                      onCheckedChange={(checked) => setSendConfirmation(checked as boolean)}
                    />
                    <Label htmlFor="confirmation" className="font-normal cursor-pointer">
                      Appointment Confirmation
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="onTheWay"
                      checked={sendOnTheWay}
                      onCheckedChange={(checked) => setSendOnTheWay(checked as boolean)}
                    />
                    <Label htmlFor="onTheWay" className="font-normal cursor-pointer">
                      On-the-Way Notification
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inProgress"
                      checked={sendInProgress}
                      onCheckedChange={(checked) => setSendInProgress(checked as boolean)}
                    />
                    <Label htmlFor="inProgress" className="font-normal cursor-pointer">
                      Job In-Progress Update
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="postJob"
                      checked={sendPostJob}
                      onCheckedChange={(checked) => setSendPostJob(checked as boolean)}
                    />
                    <Label htmlFor="postJob" className="font-normal cursor-pointer">
                      Post-Job Summary
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="review"
                      checked={sendReview}
                      onCheckedChange={(checked) => setSendReview(checked as boolean)}
                    />
                    <Label htmlFor="review" className="font-normal cursor-pointer">
                      Review Request
                    </Label>
                  </div>
                </div>
              </div>

              {/* Brand Details */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Brand Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="replyEmail">Reply-To Email</Label>
                    <Input
                      id="replyEmail"
                      type="email"
                      value={replyEmail}
                      onChange={(e) => setReplyEmail(e.target.value)}
                      placeholder="contact@yourbusiness.com"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" data-track="pcb_generate">
                Generate Pack
              </Button>
            </form>
          </Card>
        ) : (
          // Results
          <div className="space-y-8">
            <ResultPanel
              summaryContent={
                <div className="space-y-6">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-3">Quick Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Service</p>
                        <p className="font-medium">{serviceCategory}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pricing</p>
                        <p className="font-medium">{pricingModel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Job Types</p>
                        <p className="font-medium">{jobTypes.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Messages</p>
                        <p className="font-medium">
                          {[sendConfirmation, sendOnTheWay, sendInProgress, sendPostJob, sendReview].filter(Boolean)
                            .length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button size="lg" className="w-full" onClick={() => navigate("/become-provider")}>
                      Open in HomeBase
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/register")}
                      data-track="pcb_signup_click"
                    >
                      Get Started Free
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    💡 Use these templates with automated scheduling & client messaging in HomeBase
                  </p>
                </div>
              }
              detailsContent={
                <div className="space-y-6">
                  {/* Estimate */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Estimate Template</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(generatedPack.estimate, null, 2),
                            "Estimate"
                          )
                        }
                        data-track="pcb_copy_estimate"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2 font-mono text-sm">
                      {generatedPack.estimate.lineItems.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{item.description}</span>
                          <span>{item.price}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>{generatedPack.estimate.total}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-4 space-y-1">
                        {generatedPack.estimate.disclaimers.map((d, i) => (
                          <p key={i}>• {d}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  {Object.entries(generatedPack.messages).map(([key, message]) => {
                    if (!message) return null;
                    const labels: { [key: string]: string } = {
                      confirmation: "Confirmation Message",
                      onTheWay: "On-the-Way Message",
                      inProgress: "In-Progress Update",
                      postJob: "Post-Job Summary",
                      reviewRequest: "Review Request",
                    };
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{labels[key]}</h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(message, labels[key])}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-sm">{message}</div>
                      </div>
                    );
                  })}
                </div>
              }
              downloadContent={
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Export your communication pack or integrate directly with HomeBase
                  </p>

                  <DownloadButtons onDownloadPDF={handleDownloadPDF} trackingPrefix="pcb" />

                  <div className="space-y-3">
                    {Object.entries(generatedPack.policies).map(([key, policy]) => {
                      const labels: { [key: string]: string } = {
                        cancellation: "Cancellation Policy",
                        reschedule: "Reschedule Policy",
                        payment: "Payment Terms",
                      };
                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{labels[key]}</h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(policy, labels[key])}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">{policy}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium mb-2">Ready to automate?</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      HomeBase handles scheduling, messaging, and payments automatically
                    </p>
                    <Button className="w-full" onClick={() => navigate("/become-provider")}>
                      Open in HomeBase
                    </Button>
                  </div>
                </div>
              }
            />

            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setGeneratedPack(null)}>
                Create Another Pack
              </Button>
            </div>
          </div>
        )}
      </div>

      {!generatedPack && (
        <StickyFooterCTA text="Build My Pack" onClick={generatePack} trackingId="pcb_generate_mobile" />
      )}
    </div>
  );
}
