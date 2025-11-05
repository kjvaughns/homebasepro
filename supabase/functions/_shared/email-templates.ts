// Centralized HomeBase email templates with brand styling

export const HOMEBASE_COLORS = {
  primaryGreen: '#16a34a',
  lightGreen: '#22c55e',
  gradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
  textDark: '#1f2937',
  textLight: '#6b7280',
  background: '#f9fafb',
  white: '#ffffff',
  border: '#e5e7eb'
};

export const HOMEBASE_LOGO_URL = 'https://mqaplaplgfcbaaafylpf.supabase.co/storage/v1/object/public/avatars/caa5bc0f-c2bd-47fb-b875-1a76712f3b7d/avatar.png';

export const FONT_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;

interface EmailTemplateOptions {
  title: string;
  previewText: string;
  headerContent?: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
}

export function getHomeBaseEmailTemplate({
  title,
  previewText,
  headerContent,
  bodyContent,
  ctaText,
  ctaUrl,
  footerText = 'HomeBase - The #1 platform for home service professionals'
}: EmailTemplateOptions): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: ${FONT_STACK};
          background-color: ${HOMEBASE_COLORS.background};
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: ${HOMEBASE_COLORS.white};
        }
        .email-header {
          background: ${HOMEBASE_COLORS.gradient};
          padding: 32px 24px;
          text-align: center;
        }
        .logo {
          max-height: 48px;
          width: auto;
        }
        .header-text {
          color: ${HOMEBASE_COLORS.white};
          font-size: 18px;
          font-weight: 600;
          margin-top: 16px;
        }
        .email-body {
          padding: 32px 24px;
          color: ${HOMEBASE_COLORS.textDark};
          line-height: 1.6;
        }
        .cta-button {
          display: inline-block;
          padding: 14px 40px;
          background: ${HOMEBASE_COLORS.gradient};
          color: ${HOMEBASE_COLORS.white};
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 24px 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .email-footer {
          padding: 24px;
          text-align: center;
          color: ${HOMEBASE_COLORS.textLight};
          font-size: 12px;
          border-top: 1px solid ${HOMEBASE_COLORS.border};
        }
        h1, h2, h3 {
          color: ${HOMEBASE_COLORS.textDark};
          margin-top: 0;
        }
        p {
          margin: 16px 0;
        }
        ul {
          margin: 16px 0;
          padding-left: 24px;
        }
        li {
          margin: 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-header">
          <img src="${HOMEBASE_LOGO_URL}" alt="HomeBase Logo" class="logo" />
          ${headerContent ? `<div class="header-text">${headerContent}</div>` : ''}
        </div>
        
        <div class="email-body">
          ${bodyContent}
          
          ${ctaText && ctaUrl ? `
            <center>
              <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
            </center>
          ` : ''}
        </div>
        
        <div class="email-footer">
          ${footerText}<br/>
          <span style="font-size: 11px; color: ${HOMEBASE_COLORS.textLight};">
            © ${new Date().getFullYear()} HomeBase. All rights reserved.
          </span>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getProviderWelcomeEmailContent(firstName: string, dashboardUrl: string): string {
  return getHomeBaseEmailTemplate({
    title: 'Welcome to HomeBase! 🎉',
    previewText: 'Let\'s get your business set up',
    headerContent: 'Welcome to HomeBase!',
    bodyContent: `
      <h2>Hi ${firstName}! 👋</h2>
      
      <p>Welcome to <strong>HomeBase</strong> — the #1 all-in-one platform built for home service pros like you.</p>
      
      <p>We're here to help you <strong>quote jobs</strong>, <strong>schedule work</strong>, <strong>invoice clients</strong>, and <strong>get paid fast</strong> — all in one place.</p>
      
      <h3>Here's how to get started:</h3>
      <ul>
        <li>✅ <strong>Connect Stripe</strong> to get paid quickly and securely</li>
        <li>✅ <strong>Add your first client</strong> to start building your book</li>
        <li>✅ <strong>Save HomeBase to your phone</strong> home screen (works like an app!)</li>
      </ul>
      
      <p>You can use HomeBase on your desktop or save it to your phone's home screen for quick access on the go.</p>
      
      <p>Let's build something great together! 💪</p>
      
      <p style="margin-top: 32px;">
        — The HomeBase Team
      </p>
      
      <p style="font-size: 14px; color: ${HOMEBASE_COLORS.textLight};">
        <strong>P.S.</strong> Have questions? Just reply to this email — we're here to help.
      </p>
    `,
    ctaText: 'Get Started',
    ctaUrl: dashboardUrl
  });
}

export function getHomeownerWelcomeEmailContent(firstName: string, dashboardUrl: string): string {
  return getHomeBaseEmailTemplate({
    title: 'Welcome to HomeBase! 🏡',
    previewText: 'Find trusted pros for your home',
    headerContent: 'Welcome to HomeBase!',
    bodyContent: `
      <h2>Hi ${firstName}! 👋</h2>
      
      <p>Welcome to <strong>HomeBase</strong> — your trusted platform for finding and managing home service professionals.</p>
      
      <p>We make it easy to <strong>find verified pros</strong>, <strong>book services</strong>, <strong>manage your properties</strong>, and <strong>keep everything organized</strong> — all in one place.</p>
      
      <h3>Here's how to get started:</h3>
      <ul>
        <li>✅ <strong>Browse trusted providers</strong> in your area</li>
        <li>✅ <strong>Add your properties</strong> to keep everything organized</li>
        <li>✅ <strong>Save your payment info</strong> for quick and easy booking</li>
        <li>✅ <strong>Save HomeBase to your phone</strong> home screen for easy access</li>
      </ul>
      
      <p>Whether you need routine maintenance or emergency repairs, we've got you covered with vetted professionals ready to help.</p>
      
      <p>Here's to a well-maintained home! 🏡</p>
      
      <p style="margin-top: 32px;">
        — The HomeBase Team
      </p>
      
      <p style="font-size: 14px; color: ${HOMEBASE_COLORS.textLight};">
        <strong>P.S.</strong> Have questions? Just reply to this email — we're here to help.
      </p>
    `,
    ctaText: 'Explore Providers',
    ctaUrl: dashboardUrl
  });
}

export function getInvoiceEmailContent(invoiceDetails: {
  recipientName: string;
  providerName: string;
  amount: string;
  dueDate: string;
  invoiceNumber: string;
  paymentUrl: string;
  items?: Array<{ description: string; amount: string }>;
}): string {
  const itemsHtml = invoiceDetails.items?.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid ${HOMEBASE_COLORS.border};">
        ${item.description}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid ${HOMEBASE_COLORS.border}; text-align: right;">
        ${item.amount}
      </td>
    </tr>
  `).join('') || '';

  return getHomeBaseEmailTemplate({
    title: `Invoice from ${invoiceDetails.providerName}`,
    previewText: `You have a new invoice for ${invoiceDetails.amount}`,
    headerContent: 'New Invoice',
    bodyContent: `
      <h2>Hi ${invoiceDetails.recipientName},</h2>
      
      <p>You have a new invoice from <strong>${invoiceDetails.providerName}</strong>.</p>
      
      <div style="background-color: ${HOMEBASE_COLORS.background}; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
            <td style="padding: 8px 0; text-align: right;">${invoiceDetails.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Amount Due:</strong></td>
            <td style="padding: 8px 0; text-align: right; font-size: 20px; font-weight: bold; color: ${HOMEBASE_COLORS.primaryGreen};">
              ${invoiceDetails.amount}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
            <td style="padding: 8px 0; text-align: right;">${invoiceDetails.dueDate}</td>
          </tr>
        </table>
        
        ${itemsHtml ? `
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid ${HOMEBASE_COLORS.border};">Description</th>
                <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid ${HOMEBASE_COLORS.border};">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        ` : ''}
      </div>
      
      <p>Click the button below to view and pay your invoice securely.</p>
    `,
    ctaText: 'Pay Invoice Now',
    ctaUrl: invoiceDetails.paymentUrl,
    footerText: 'This invoice is powered by HomeBase'
  });
}

export function getNotificationEmailContent(notification: {
  recipientName: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionText?: string;
}): string {
  return getHomeBaseEmailTemplate({
    title: notification.title,
    previewText: notification.body,
    bodyContent: `
      <h2>Hi ${notification.recipientName},</h2>
      
      <h3>${notification.title}</h3>
      
      <p>${notification.body}</p>
    `,
    ctaText: notification.actionText,
    ctaUrl: notification.actionUrl
  });
}
