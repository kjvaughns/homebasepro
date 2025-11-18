/**
 * Shared email footer with HomeBase pitch
 * To be included in all customer-facing emails
 */
export const getHomeBasePitch = () => `
  <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center;">
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
      💡 <strong style="color: #1f2937;">Want to manage all your home maintenance in one place?</strong>
    </p>
    <p style="margin-bottom: 20px;">
      <a href="https://homebaseproapp.com" 
         style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
        Try HomeBase
      </a>
    </p>
    <p style="color: #9ca3af; font-size: 13px;">
      Track appointments, manage providers, and never miss maintenance reminders.
    </p>
  </div>
`;

export const getEmailFooter = (includePitch: boolean = true) => `
  ${includePitch ? getHomeBasePitch() : ''}
  <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 5px 0;">Powered by HomeBase</p>
    <p style="margin: 5px 0;">
      <a href="https://homebaseproapp.com/privacy" style="color: #9ca3af; text-decoration: none;">Privacy Policy</a> | 
      <a href="https://homebaseproapp.com/terms" style="color: #9ca3af; text-decoration: none;">Terms of Service</a>
    </p>
  </div>
`;
