import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PartnerApprovedProps {
  partnerName: string;
  referralCode: string;
  discountRate: number;
  commissionRate: number;
  onboardingUrl: string;
}

export const PartnerApproved = ({
  partnerName,
  referralCode,
  discountRate,
  commissionRate,
  onboardingUrl,
}: PartnerApprovedProps) => (
  <Html>
    <Head />
    <Preview>Welcome to the HomeBase Partner Program! 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to HomeBase Partners! 🎉</Heading>
        <Text style={text}>Hi {partnerName},</Text>
        <Text style={text}>
          Great news! Your application has been approved. You're now an official HomeBase Partner.
        </Text>
        <Text style={text}>
          <strong>Your Partner Details:</strong>
        </Text>
        <Text style={text}>
          • Referral Code: <strong>{referralCode}</strong><br/>
          • Customer Discount: {discountRate}% off<br/>
          • Your Commission: {commissionRate}% lifetime revenue share
        </Text>
        <Text style={text}>
          <strong>Next Step: Set Up Payouts</strong>
        </Text>
        <Text style={text}>
          To start earning commissions, you need to connect your payout account through Stripe. This only takes 2 minutes:
        </Text>
        <Button href={onboardingUrl} style={button}>
          Complete Payout Setup
        </Button>
        <Text style={text}>
          Once your account is verified, you'll start earning commissions on every referral that converts to a paying customer.
        </Text>
        <Text style={text}>
          <strong>Your Partner Dashboard:</strong><br/>
          Track clicks, referrals, and earnings at:{' '}
          <Link href="https://homebaseproapp.com/partners/dashboard" style={link}>
            Partner Dashboard
          </Link>
        </Text>
        <Text style={text}>
          <strong>Resources Available:</strong><br/>
          • Brand assets & logos<br/>
          • Marketing messaging guides<br/>
          • Referral link tracking<br/>
          • Monthly payout reports
        </Text>
        <Text style={text}>
          Questions? Reply to this email or check out the{' '}
          <Link href="https://homebaseproapp.com/partners/resources" style={link}>
            Partner Resources
          </Link>{' '}
          page.
        </Text>
        <Text style={footer}>
          Welcome aboard!<br/>
          The HomeBase Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PartnerApproved;

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

const button = {
  backgroundColor: '#2754C5',
  color: '#fff',
  padding: '12px 24px',
  textDecoration: 'none',
  borderRadius: '6px',
  display: 'inline-block',
  fontWeight: 'bold',
  margin: '16px 0',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  marginTop: '32px',
};
