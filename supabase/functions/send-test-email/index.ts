import { Resend } from 'https://esm.sh/resend@2.0.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const { to, subject, message } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing recipient email' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    console.log('Sending test email to:', to);

    const logoUrl = 'https://mqaplaplgfcbaaafylpf.supabase.co/storage/v1/object/public/avatars/caa5bc0f-c2bd-47fb-b875-1a76712f3b7d/avatar.png';
    
    try {
      // Try with primary domain first
      const result = await resend.emails.send({
        from: 'HomeBase <notifications@homebaseproapp.com>',
        to,
        subject: subject || 'Test Email from HomeBase',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background: white;">
              <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px 24px; text-align: center;">
                <img src="${logoUrl}" alt="HomeBase" style="max-height: 48px; width: auto; margin-bottom: 12px;" />
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">✉️ Test Email</h1>
              </div>
              
              <div style="padding: 32px 24px;">
                <p style="margin: 0 0 20px 0;">${message || 'This is a test email from HomeBase to verify email delivery is working correctly.'}</p>
                
                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-size: 14px;">
                    <strong>✅ Success!</strong> If you're reading this, your email configuration is working properly.
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                  Sent at: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}
                </p>
              </div>
              
              <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0;">HomeBase - The #1 platform for home service professionals</p>
                <p style="font-size: 11px; color: #9ca3af; margin: 4px 0 0 0;">© ${new Date().getFullYear()} HomeBase. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      console.log('✅ Test email sent successfully:', result);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test email sent successfully',
          result,
          from: 'notifications@homebaseproapp.com'
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );

    } catch (primaryError: any) {
      console.error('❌ Primary domain failed:', primaryError);

      // Try fallback to verified sender
      if (primaryError.statusCode === 403 || primaryError.statusCode === 422) {
        console.log('🔄 Trying fallback sender...');
        
        const fallbackResult = await resend.emails.send({
          from: 'HomeBase <onboarding@resend.dev>',
          to,
          subject: subject || 'Test Email from HomeBase (Fallback)',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
              <div style="max-width: 600px; margin: 0 auto; background: white;">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center;">
                  <img src="${logoUrl}" alt="HomeBase" style="max-height: 48px; width: auto; margin-bottom: 12px;" />
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">⚠️ Test Email (Fallback)</h1>
                </div>
                
                <div style="padding: 32px 24px;">
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 0 0 20px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px;">
                      <strong>⚠️ Domain Not Verified</strong><br/>
                      Your custom domain (notifications@homebaseproapp.com) is not yet verified in Resend. This email was sent using the fallback sender.
                    </p>
                  </div>
                  
                  <p style="margin: 0 0 20px 0;">${message || 'This is a test email from HomeBase using the fallback sender.'}</p>
                  
                  <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0; font-size: 14px;">
                      <strong>Next Steps:</strong>
                    </p>
                    <ol style="margin: 0; padding-left: 20px; font-size: 14px;">
                      <li>Verify notifications@homebaseproapp.com in Resend</li>
                      <li>Add DNS records (SPF, DKIM, Return-Path)</li>
                      <li>Test again to confirm</li>
                    </ol>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                    Sent at: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}
                  </p>
                </div>
                
                <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">HomeBase - The #1 platform for home service professionals</p>
                  <p style="font-size: 11px; color: #9ca3af; margin: 4px 0 0 0;">© ${new Date().getFullYear()} HomeBase. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });

        console.log('✅ Fallback email sent successfully:', fallbackResult);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Test email sent via fallback (domain not verified)',
            result: fallbackResult,
            from: 'onboarding@resend.dev',
            warning: 'Primary domain not verified. Add DNS records to use notifications@homebaseproapp.com'
          }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      throw primaryError;
    }

  } catch (error: any) {
    console.error('Test email error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send test email',
        details: error
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
