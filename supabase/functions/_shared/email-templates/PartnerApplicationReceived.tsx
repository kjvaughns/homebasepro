import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PartnerApplicationReceivedProps {
  applicantName: string;
}

export const PartnerApplicationReceived = ({
  applicantName,
}: PartnerApplicationReceivedProps) => (
  <Html>
    <Head />
    <Preview>Thank you for applying to HomeBase Partners</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Application Received!</Heading>
        <Text style={text}>Hi {applicantName},</Text>
        <Text style={text}>
          Thank you for applying to the HomeBase Partner Program. We're excited that you want to partner with us!
        </Text>
        <Text style={text}>
          Our team is currently reviewing your application. You'll hear from us within 1-2 business days with a decision.
        </Text>
        <Text style={text}>
          <strong>What happens next?</strong>
        </Text>
        <Text style={text}>
          • We'll review your application<br/>
          • If approved, you'll receive your unique referral code<br/>
          • You'll set up your payout account through Stripe<br/>
          • Start earning commissions immediately!
        </Text>
        <Text style={text}>
          Questions? Reply to this email or check out our{' '}
          <Link href="https://homebaseproapp.com/partners" style={link}>
            Partner FAQ
          </Link>.
        </Text>
        <Text style={footer}>
          Best,<br/>
          The HomeBase Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PartnerApplicationReceived;

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};

const link = {
  color: '#2754C5',
  textDecoration: 'underline',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  marginTop: '32px',
};
