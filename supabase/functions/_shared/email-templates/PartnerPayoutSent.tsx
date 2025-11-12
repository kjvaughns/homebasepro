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

interface PartnerPayoutSentProps {
  partnerName: string;
  amount: number;
  transferId: string;
  commissionsCount: number;
}

export const PartnerPayoutSent = ({
  partnerName,
  amount,
  transferId,
  commissionsCount,
}: PartnerPayoutSentProps) => (
  <Html>
    <Head />
    <Preview>Your ${amount.toFixed(2)} payout has been sent</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payout Sent! 💰</Heading>
        <Text style={text}>Hi {partnerName},</Text>
        <Text style={text}>
          Great news! Your partner commission payout has been processed.
        </Text>
        <Text style={payoutBox}>
          <strong style={amountStyle}>${amount.toFixed(2)}</strong><br/>
          <span style={labelStyle}>Paid via Stripe Transfer</span>
        </Text>
        <Text style={text}>
          <strong>Payment Details:</strong>
        </Text>
        <Text style={text}>
          • Amount: ${amount.toFixed(2)}<br/>
          • Commissions Included: {commissionsCount}<br/>
          • Transfer ID: {transferId}<br/>
          • Date: {new Date().toLocaleDateString()}
        </Text>
        <Text style={text}>
          Funds should appear in your bank account within 2-3 business days, depending on your bank.
        </Text>
        <Text style={text}>
          <Link href="https://homebaseproapp.com/partners/payouts" style={link}>
            View Payout History →
          </Link>
        </Text>
        <Text style={text}>
          Thank you for being a valued HomeBase Partner! Keep up the great work.
        </Text>
        <Text style={footer}>
          Best,<br/>
          The HomeBase Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PartnerPayoutSent;

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

const payoutBox = {
  backgroundColor: '#f0f9ff',
  border: '2px solid #2754C5',
  borderRadius: '8px',
  padding: '24px',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const amountStyle = {
  fontSize: '32px',
  color: '#2754C5',
};

const labelStyle = {
  fontSize: '12px',
  color: '#666',
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
