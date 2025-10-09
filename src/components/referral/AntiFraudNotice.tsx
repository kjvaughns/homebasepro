import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Shield, AlertCircle } from 'lucide-react';

export function AntiFraudNotice() {
  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Referral Guidelines</h3>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="how-it-works" className="border-none">
          <AccordionTrigger className="text-sm py-2">
            How referrals work
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            <ul className="space-y-2 ml-4 list-disc">
              <li>Share your unique referral link with friends</li>
              <li>When they sign up using your link, you get credit</li>
              <li>Providers earn discounts, homeowners earn service credits</li>
              <li>Rewards are automatically tracked and applied</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="eligibility" className="border-none">
          <AccordionTrigger className="text-sm py-2">
            Eligibility requirements
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            <ul className="space-y-2 ml-4 list-disc">
              <li>Each email and phone number can only sign up once</li>
              <li>Referrals must use different devices from the referrer</li>
              <li>Self-referrals are not allowed</li>
              <li>For homeowner credits, referred friends must make a qualifying purchase</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fraud-prevention" className="border-none">
          <AccordionTrigger className="text-sm py-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Fraud prevention</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            <p className="mb-2">
              To ensure fair play and prevent abuse, we verify:
            </p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>Unique email addresses and phone numbers</li>
              <li>Different devices and locations</li>
              <li>Legitimate signup patterns</li>
              <li>Purchase verification for credit rewards</li>
            </ul>
            <p className="mt-3 text-xs italic">
              Suspicious activity may result in referral credits being withheld or accounts being reviewed.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rewards" className="border-none">
          <AccordionTrigger className="text-sm py-2">
            Reward details
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground mb-1">Providers:</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>25% lifetime discount (beta) after 5 referrals</li>
                  <li>10% lifetime discount (post-launch) after 5 referrals</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Homeowners:</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>$50 service credit per 5 qualified referrals</li>
                  <li>Qualified = friend joins AND makes a purchase</li>
                  <li>Unlimited earning potential</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
