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

interface PartnerApplicationNotifyAdminProps {
  applicantName: string;
  applicantEmail: string;
  partnerType: string;
  businessName?: string;
  website?: string;
}

export const PartnerApplicationNotifyAdmin = ({
  applicantName,
  applicantEmail,
  partnerType,
  businessName,
  website,
}: PartnerApplicationNotifyAdminProps) => (
  <Html>
    <Head />
    <Preview>New Partner Application: {applicantName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Partner Application</Heading>
        <Text style={text}>
          A new partner has applied to the HomeBase Partner Program.
        </Text>
        <Text style={text}>
          <strong>Applicant Details:</strong>
        </Text>
        <Text style={text}>
          • Name: {applicantName}<br/>
          • Email: {applicantEmail}<br/>
          • Type: {partnerType}<br/>
          {businessName && `• Business: ${businessName}`}<br/>
          {website && `• Website: ${website}`}
        </Text>
        <Text style={text}>
          <Link href="https://homebaseproapp.com/admin/partners" style={link}>
            Review Application →
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PartnerApplicationNotifyAdmin;

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
