import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { IntakeQuestionsForm } from "./IntakeQuestionsForm";
import { AIFollowUpQuestions } from "./AIFollowUpQuestions";
import { toast } from "sonner";
import { format } from "date-fns";

interface Service {
  id: string;
  name: string;
  default_price: number;
  estimated_duration_minutes: number;
  description?: string;
}

interface PublicBookingFormProps {
  providerId: string;
  providerName: string;
  services: Service[];
}

type Step = "service" | "intake" | "ai-followup" | "datetime" | "contact";

export function PublicBookingForm({ providerId, providerName, services }: PublicBookingFormProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("service");
  const [loading, setLoading] = useState(false);

  // Form data
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [intakeResponses, setIntakeResponses] = useState<Record<string, any>>({});
  const [aiFollowUpResponses, setAiFollowUpResponses] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [contactInfo, setContactInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  });

  const steps: Step[] = ["service", "intake", "ai-followup", "datetime", "contact"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const availableTimes = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
  ];

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Please complete all required fields");
      return;
    }

    if (!contactInfo.name || !contactInfo.email || !contactInfo.address) {
      toast.error("Please provide your contact information");
      return;
    }

    try {
      setLoading(true);

      // Combine date and time
      const [hours, minutes, period] = selectedTime.match(/(\d+):(\d+) (\w+)/)?.slice(1) || [];
      let hour = parseInt(hours);
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hour, parseInt(minutes), 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + selectedService.estimated_duration_minutes);

      // Create booking
      const { data, error } = await supabase.functions.invoke("check-and-create-booking", {
        body: {
          provider_org_id: providerId,
          service_name: selectedService.name,
          address: contactInfo.address,
          date_time_start: startDateTime.toISOString(),
          date_time_end: endDateTime.toISOString(),
          notes: contactInfo.notes,
          intake_responses: intakeResponses,
          ai_follow_up_responses: aiFollowUpResponses,
          estimated_price_low: selectedService.default_price,
          estimated_price_high: selectedService.default_price,
          contact_info: {
            name: contactInfo.name,
            email: contactInfo.email,
            phone: contactInfo.phone
          }
        }
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || "Failed to create booking");
        return;
      }

      toast.success("Booking request submitted successfully!");
      
      // Show account creation prompt
      toast.info("Create an account to track your booking and manage future services", {
        duration: 5000,
        action: {
          label: "Sign Up",
          onClick: () => navigate("/signup")
        }
      });

      // Navigate to booking confirmation or marketplace
      navigate("/marketplace");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to submit booking request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Book {providerName}</CardTitle>
          <CardDescription>
            Complete the steps below to request a booking
          </CardDescription>
          <Progress value={progress} className="mt-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Select Service */}
          {currentStep === "service" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Select a Service</h3>
              <RadioGroup
                value={selectedService?.id}
                onValueChange={(value) => {
                  const service = services.find(s => s.id === value);
                  setSelectedService(service || null);
                }}
              >
                {services.map((service) => (
                  <div key={service.id} className="flex items-start space-x-3 border rounded-lg p-4">
                    <RadioGroupItem value={service.id} id={service.id} />
                    <Label htmlFor={service.id} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            ~{service.estimated_duration_minutes} minutes
                          </p>
                        </div>
                        <p className="font-semibold">${(service.default_price / 100).toFixed(2)}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 2: Intake Questions */}
          {currentStep === "intake" && selectedService && (
            <IntakeQuestionsForm
              providerId={providerId}
              responses={intakeResponses}
              onResponsesChange={setIntakeResponses}
            />
          )}

          {/* Step 3: AI Follow-up */}
          {currentStep === "ai-followup" && (
            <AIFollowUpQuestions
              providerId={providerId}
              serviceId={selectedService?.id || ""}
              intakeResponses={intakeResponses}
              responses={aiFollowUpResponses}
              onResponsesChange={setAiFollowUpResponses}
            />
          )}

          {/* Step 4: Date/Time Selection */}
          {currentStep === "datetime" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Select Date & Time</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
              {selectedDate && (
                <div>
                  <Label>Select Time</Label>
                  <RadioGroup value={selectedTime} onValueChange={setSelectedTime}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {availableTimes.map((time) => (
                        <div key={time} className="flex items-center space-x-2">
                          <RadioGroupItem value={time} id={time} />
                          <Label htmlFor={time} className="cursor-pointer">{time}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Contact Info */}
          {currentStep === "contact" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Your Contact Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={contactInfo.name}
                    onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Service Address *</Label>
                  <Input
                    id="address"
                    value={contactInfo.address}
                    onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={contactInfo.notes}
                    onChange={(e) => setContactInfo({ ...contactInfo, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStepIndex < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === "service" && !selectedService) ||
                  (currentStep === "datetime" && (!selectedDate || !selectedTime))
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit Booking Request"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
