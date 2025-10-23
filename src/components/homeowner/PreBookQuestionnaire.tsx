import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { prebookSchema, type PreBookData } from "@/schemas/prebookSchema";
import { AlertCircle, Clock, Home, Phone } from "lucide-react";

interface PreBookQuestionnaireProps {
  onComplete: (data: PreBookData) => void;
  onBack?: () => void;
}

export function PreBookQuestionnaire({ onComplete, onBack }: PreBookQuestionnaireProps) {
  const [hasPets, setHasPets] = useState(false);

  const form = useForm<PreBookData>({
    resolver: zodResolver(prebookSchema),
    defaultValues: {
      issue_description: "",
      urgency_level: "medium",
      has_pets: false,
      pet_details: "",
      access_notes: "",
      gate_code: "",
      preferred_contact: "app",
      special_instructions: ""
    }
  });

  const onSubmit = (data: PreBookData) => {
    onComplete(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Quick pre-booking questions to help your provider prepare</p>
          </div>

          <FormField
            control={form.control}
            name="issue_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What's the issue or service needed?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what you need help with..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Be specific - it helps the provider come prepared with the right tools
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="urgency_level"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  How urgent is this?
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="low" id="low" />
                      <label htmlFor="low" className="flex-1 cursor-pointer">
                        <div className="font-medium">Low</div>
                        <div className="text-xs text-muted-foreground">Can wait a week+</div>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="medium" id="medium" />
                      <label htmlFor="medium" className="flex-1 cursor-pointer">
                        <div className="font-medium">Medium</div>
                        <div className="text-xs text-muted-foreground">Few days</div>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="high" id="high" />
                      <label htmlFor="high" className="flex-1 cursor-pointer">
                        <div className="font-medium">High</div>
                        <div className="text-xs text-muted-foreground">Next 24-48h</div>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="emergency" id="emergency" />
                      <label htmlFor="emergency" className="flex-1 cursor-pointer">
                        <div className="font-medium text-destructive">Emergency</div>
                        <div className="text-xs text-muted-foreground">ASAP</div>
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="has_pets"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setHasPets(checked as boolean);
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>I have pets on the property</FormLabel>
                  <FormDescription>
                    Let the provider know about any pets they should be aware of
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {hasPets && (
            <FormField
              control={form.control}
              name="pet_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet Details</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Friendly dog, will be inside during visit" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="access_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Access Instructions (Optional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Use side gate, key under mat, etc."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gate_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gate/Entry Code (Optional)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Enter code if applicable" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preferred_contact"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Preferred Contact Method
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="app" id="app" />
                      <label htmlFor="app" className="cursor-pointer">Via App Messages</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="phone" />
                      <label htmlFor="phone" className="cursor-pointer">Phone Call</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="text" />
                      <label htmlFor="text" className="cursor-pointer">Text Message</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="special_instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Instructions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Anything else the provider should know?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
          )}
          <Button type="submit" className="flex-1">
            Continue to Date & Time
          </Button>
        </div>
      </form>
    </Form>
  );
}
