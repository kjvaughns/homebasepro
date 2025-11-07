-- Seed Knowledge Articles for HomeBase AI
-- Run this SQL in your Supabase SQL editor after the migration completes

-- Getting Started
INSERT INTO knowledge_articles (title, content, category, tags, priority) VALUES
('What is HomeBase?', 'HomeBase is an all-in-one platform connecting homeowners with trusted service providers. We handle bookings, payments, scheduling, and communication - making home services effortless. Homeowners can find and book vetted providers instantly, while providers get powerful tools to manage their business including scheduling, invoicing, client management, and marketing.', 'getting_started', ARRAY['overview', 'intro'], 10),

('How to Create an Account', 'Creating a HomeBase account is simple: 1) Click "Sign Up" in the top right, 2) Choose your account type (Homeowner or Provider), 3) Enter your email and create a password, 4) Verify your email, 5) Complete your profile with basic information. For providers, you''ll also add your business details, services offered, and service areas.', 'getting_started', ARRAY['signup', 'registration', 'account'], 9),

('HomeBase Mobile App', 'The HomeBase mobile app is available for iOS and Android. It offers all the same features as the web platform: booking services, real-time messaging, payment processing, scheduling, and notifications. Download from the App Store or Google Play. Sign in with your existing account or create a new one directly in the app.', 'getting_started', ARRAY['mobile', 'app', 'ios', 'android'], 8);

-- Homeowners
INSERT INTO knowledge_articles (title, content, category, tags, priority) VALUES
('How to Book a Service', 'Booking a service on HomeBase is easy: 1) Click "Find Services" and select the service you need, 2) Enter your location and service details, 3) Browse available providers with ratings and reviews, 4) Select a provider and choose an available time slot, 5) Confirm booking and payment method. You''ll receive instant confirmation and can chat with your provider directly through the app.', 'homeowners', ARRAY['booking', 'scheduling'], 10),

('Payment Methods', 'HomeBase accepts all major credit cards (Visa, Mastercard, Amex, Discover), debit cards, and digital wallets (Apple Pay, Google Pay). All payments are processed securely through Stripe. You can save payment methods for faster checkout. Payment is typically charged after service completion, but some providers may require upfront deposits.', 'homeowners', ARRAY['payment', 'billing', 'stripe'], 9),

('How to Message Providers', 'Once you book a service, you can message your provider directly through HomeBase. Go to "My Bookings", select the booking, and click "Message". Messages are real-time and both parties receive notifications. You can discuss service details, share photos, confirm timing, or ask questions. Message history is saved for your records.', 'homeowners', ARRAY['messaging', 'communication', 'chat'], 8),

('Cancellation Policy', 'Cancellation policies vary by provider. Most allow free cancellation 24-48 hours before the scheduled service. To cancel: Go to "My Bookings", select the booking, click "Cancel Booking", and follow the prompts. If you cancel within the provider''s notice period, you may incur a cancellation fee. Emergency cancellations can be discussed directly with your provider.', 'homeowners', ARRAY['cancellation', 'refund'], 8),

('Service Guarantee', 'All HomeBase providers are vetted and insured. If you''re not satisfied with a service, contact us within 48 hours. We offer a satisfaction guarantee: We''ll work with the provider to make it right, arrange a re-service at no charge, or provide a partial/full refund depending on the situation. Your satisfaction is our priority.', 'homeowners', ARRAY['guarantee', 'satisfaction', 'quality'], 7);

-- Providers
INSERT INTO knowledge_articles (title, content, category, tags, priority) VALUES
('Provider Subscription Plans', 'HomeBase offers tiered subscription plans for providers: FREE (8% transaction fee, basic features), GROWTH $29/mo (2.5% fee, advanced scheduling), PRO $99/mo (2% fee, priority placement, unlimited jobs), SCALE $299/mo (1.5% fee, dedicated support, API access). All plans include client management, invoicing, messaging, and mobile app access. Upgrade anytime to unlock more features and lower fees.', 'providers', ARRAY['pricing', 'subscription', 'plans', 'fees'], 10),

('How to Accept Bookings', 'When a homeowner books your service, you''ll receive a notification via app, email, and SMS. To accept: 1) Open the booking request, 2) Review service details and schedule, 3) Click "Accept" to confirm. You can also message the homeowner with questions before accepting. Once accepted, the booking appears in your calendar and the homeowner is notified. You can set auto-accept for certain services.', 'providers', ARRAY['booking', 'scheduling', 'accept'], 9),

('Managing Your Calendar', 'Keep your calendar up-to-date to prevent double-bookings: 1) Go to "Calendar" in the provider dashboard, 2) Set your availability by day and time, 3) Block off personal time or existing commitments, 4) Sync with Google Calendar or Apple Calendar for unified scheduling. HomeBase only shows your available slots to homeowners. Update in real-time as your schedule changes.', 'providers', ARRAY['calendar', 'scheduling', 'availability'], 9),

('Creating Invoices', 'HomeBase automatically generates invoices after job completion, but you can also create custom invoices: 1) Go to "Invoices" > "Create New", 2) Select the client and job, 3) Add line items with descriptions and amounts, 4) Include any taxes or discounts, 5) Send to client. Clients can pay directly through HomeBase. Track payment status and send reminders for unpaid invoices.', 'providers', ARRAY['invoicing', 'billing', 'payment'], 8),

('Getting Paid', 'Payments are processed through Stripe Connect. When a client pays, funds are transferred to your linked bank account within 2-3 business days. HomeBase automatically deducts the transaction fee based on your subscription plan. View payment history, pending payments, and total earnings in the "Payments" dashboard. You can also download detailed financial reports for taxes.', 'providers', ARRAY['payment', 'payout', 'earnings'], 8),

('Building Your Profile', 'A strong profile attracts more clients: 1) Add professional photos of your work, 2) Write a compelling bio highlighting your experience and specialties, 3) List all services you offer with clear descriptions and pricing, 4) Add certifications, licenses, and insurance information, 5) Encourage satisfied clients to leave reviews. Update your profile regularly with new photos and services.', 'providers', ARRAY['profile', 'marketing', 'reviews'], 7),

('HomeBase AI Assistant', 'HomeBase AI helps you manage your business: Ask questions like "Show me this week''s schedule", "Create an invoice for $500", "What''s my total earnings?", or "Find available time slots tomorrow". The AI can schedule bookings, send quotes, update your calendar, generate reports, and answer business questions. Access via the chat icon or "Ask AI" button anywhere in the app.', 'providers', ARRAY['ai', 'assistant', 'automation'], 7);

-- Troubleshooting
INSERT INTO knowledge_articles (title, content, category, tags, priority) VALUES
('Payment Issues', 'If a payment fails: 1) Verify your payment method is valid and has sufficient funds, 2) Check that billing address matches your card, 3) Try a different payment method, 4) Clear browser cache and try again, 5) Contact your bank to ensure they''re not blocking the charge. If issues persist, contact HomeBase support with the error message and we''ll help resolve it immediately.', 'troubleshooting', ARRAY['payment', 'error', 'failed'], 8),

('App Not Working', 'If the HomeBase app isn''t working properly: 1) Force close and reopen the app, 2) Check for app updates in the App Store/Google Play, 3) Ensure you have a stable internet connection, 4) Clear app cache (Settings > Apps > HomeBase > Clear Cache), 5) Restart your device, 6) Uninstall and reinstall if needed. Your data is saved in the cloud and will sync automatically.', 'troubleshooting', ARRAY['app', 'bug', 'crash', 'error'], 8),

('Notification Issues', 'Not receiving notifications? 1) Enable notifications for HomeBase in your device settings, 2) Check that "Do Not Disturb" is off, 3) In HomeBase settings, verify notification preferences are enabled, 4) For email notifications, check spam folder and add no-reply@homebase.app to contacts, 5) For SMS, verify your phone number is correct in your profile.', 'troubleshooting', ARRAY['notifications', 'alerts', 'sms', 'email'], 7),

('Can''t Find a Provider', 'If you can''t find providers in your area: 1) Expand your search radius, 2) Try broader service categories, 3) Be flexible with timing - some providers have limited availability, 4) Check back later as new providers join daily, 5) Submit a service request and we''ll notify providers in your area. If you''re in a new market, we''re actively recruiting providers.', 'troubleshooting', ARRAY['search', 'providers', 'availability'], 6);

-- Features
INSERT INTO knowledge_articles (title, content, category, tags, priority) VALUES
('Real-Time Messaging', 'HomeBase includes built-in messaging between homeowners and providers. Features: Real-time chat with push notifications, Share photos and documents, Quick replies for common questions, Message history saved indefinitely, Read receipts, Video call option for consultations. Access via "Messages" tab or directly from any booking. All messages are monitored for safety and professionalism.', 'features', ARRAY['messaging', 'chat', 'communication'], 7),

('Smart Scheduling', 'HomeBase AI optimizes scheduling: Suggests best time slots based on provider availability and homeowner preferences, Automatic reminders sent 24 hours and 1 hour before service, One-click rescheduling if plans change, Buffer time between jobs to prevent delays, Travel time calculations, Recurring service booking for regular maintenance. Calendar syncs with Google Calendar and Apple Calendar.', 'features', ARRAY['scheduling', 'calendar', 'automation'], 7),

('Service Marketplace', 'The HomeBase marketplace connects you with vetted professionals: Browse by service type (plumbing, electrical, cleaning, landscaping, etc), Filter by ratings, price, availability, and location, Compare providers side-by-side, Read verified reviews from past clients, Instant booking or request quotes, Secure payment processing, Quality guarantee on all services.', 'features', ARRAY['marketplace', 'search', 'booking'], 6);

-- Billing
INSERT INTO knowledge_articles (title, content, category, tags, priority) VALUES
('Transaction Fees', 'HomeBase charges providers a small transaction fee per job: FREE plan: 8% per transaction, GROWTH plan ($29/mo): 2.5% per transaction, PRO plan ($99/mo): 2% per transaction, SCALE plan ($299/mo): 1.5% per transaction. Fees are automatically deducted when clients pay. No hidden fees. Upgrade your plan to reduce fees and increase earnings. Homeowners never pay platform fees.', 'billing', ARRAY['fees', 'pricing', 'transaction'], 8),

('Refund Process', 'Refund timeline depends on the situation: Service cancellation: Instant refund to original payment method, Partial refunds: Processed within 2-3 business days, Dispute resolution: Up to 7 days while we investigate. Refunds appear in your account within 5-10 business days depending on your bank. You''ll receive email confirmation when a refund is processed. Contact support if you have questions.', 'billing', ARRAY['refund', 'cancellation', 'payment'], 7);

-- Technical
INSERT INTO knowledge_articles (title, content, category, tags, priority) VALUES
('API Access', 'Enterprise and SCALE plan providers can access the HomeBase API: Integrate with your existing business software, Automate booking and scheduling workflows, Sync client data bidirectionally, Custom reporting and analytics, Webhook notifications for real-time updates. View API documentation at docs.homebase.app/api. Contact support to get your API keys and sandbox environment.', 'technical', ARRAY['api', 'integration', 'developer'], 5),

('Data Security', 'HomeBase takes security seriously: All data encrypted in transit (TLS 1.3) and at rest (AES-256), Payment processing through PCI-compliant Stripe, Two-factor authentication available, Regular security audits and penetration testing, GDPR and CCPA compliant, SOC 2 Type II certified. We never sell your data. Review our full security policy and privacy policy in Settings > Legal.', 'technical', ARRAY['security', 'privacy', 'encryption'], 6);

-- AI Quick Replies
INSERT INTO ai_quick_replies (trigger_keywords, response_text, category, priority) VALUES
(ARRAY['hours', 'open', 'available', 'when'], 'HomeBase is available 24/7! You can book services, message providers, and manage your account anytime. For customer support, our team is available Monday-Friday 9am-6pm EST, or you can chat with me anytime.', 'general', 10),

(ARRAY['price', 'cost', 'how much', 'fee'], 'Pricing varies by service and provider. Homeowners see transparent pricing before booking with no hidden fees. Providers set their own rates and pay a small transaction fee based on their subscription plan (1.5% - 8%). Want to know the cost for a specific service?', 'pricing', 9),

(ARRAY['cancel', 'cancellation', 'refund'], 'You can cancel most bookings up to 24-48 hours before the scheduled time without penalty. Go to "My Bookings", select the booking, and click "Cancel". Refunds are processed within 2-3 business days. Need help canceling a specific booking?', 'cancellation', 9),

(ARRAY['help', 'support', 'contact'], 'I''m here to help! I can answer questions about bookings, payments, scheduling, and more. For complex issues or if you need to speak with a human, you can: Email: support@homebase.app, Live chat with our team (Mon-Fri 9am-6pm EST), or call: 1-800-HOMEBASE. What can I help you with?', 'support', 10),

(ARRAY['emergency', 'urgent', 'asap', 'now'], 'For emergency services (plumbing, electrical, HVAC), use our "Emergency Booking" feature: 1) Select "Emergency" when booking, 2) We''ll immediately notify available providers in your area, 3) Get connected within minutes. For life-threatening emergencies, always call 911 first. How can I help with your urgent need?', 'emergency', 10);