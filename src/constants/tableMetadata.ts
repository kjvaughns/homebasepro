export interface TableMetadata {
  displayName: string;
  description: string;
  essentialColumns: string[];
  category: string;
}

export const TABLE_METADATA: Record<string, TableMetadata> = {
  waitlist: {
    displayName: "Waitlist",
    description: "Users who have signed up for early access to the platform",
    essentialColumns: ["email", "full_name", "account_type", "created_at"],
    category: "Users & Auth",
  },
  profiles: {
    displayName: "User Profiles",
    description: "User profile information for all registered users",
    essentialColumns: ["full_name", "user_type", "phone", "created_at"],
    category: "Users & Auth",
  },
  user_roles: {
    displayName: "User Roles",
    description: "Admin and moderator role assignments",
    essentialColumns: ["user_id", "role", "created_at"],
    category: "Users & Auth",
  },
  organizations: {
    displayName: "Organizations",
    description: "Service provider business organizations",
    essentialColumns: ["name", "owner_id", "service_type", "service_area"],
    category: "Providers",
  },
  service_plans: {
    displayName: "Service Plans",
    description: "Service offerings created by provider organizations",
    essentialColumns: ["organization_id", "name", "price", "billing_frequency"],
    category: "Providers",
  },
  clients: {
    displayName: "Clients",
    description: "Provider clients and customer relationships",
    essentialColumns: ["organization_id", "name", "email", "status"],
    category: "Providers",
  },
  client_subscriptions: {
    displayName: "Client Subscriptions",
    description: "Active subscriptions between providers and their clients",
    essentialColumns: ["client_id", "plan_id", "status", "start_date"],
    category: "Subscriptions",
  },
  homeowner_subscriptions: {
    displayName: "Homeowner Subscriptions",
    description: "Homeowner subscriptions to provider services",
    essentialColumns: ["homeowner_id", "provider_org_id", "status", "billing_amount"],
    category: "Subscriptions",
  },
  subscription_plans: {
    displayName: "Platform Subscription Plans",
    description: "Platform subscription tiers for provider organizations",
    essentialColumns: ["tier", "name", "price_monthly", "transaction_fee_percent"],
    category: "Subscriptions",
  },
  organization_subscriptions: {
    displayName: "Organization Subscriptions",
    description: "Provider organization subscriptions to the platform",
    essentialColumns: ["organization_id", "plan_tier", "status", "current_period_end"],
    category: "Subscriptions",
  },
  homes: {
    displayName: "Properties",
    description: "Homeowner property records",
    essentialColumns: ["owner_id", "name", "address", "city", "state"],
    category: "Properties",
  },
  service_requests: {
    displayName: "Service Requests",
    description: "Homeowner requests for service from providers",
    essentialColumns: ["homeowner_id", "service_type", "status", "scheduled_date"],
    category: "Services",
  },
  service_visits: {
    displayName: "Service Visits",
    description: "Completed or scheduled service visits",
    essentialColumns: ["homeowner_id", "provider_org_id", "status", "scheduled_date"],
    category: "Services",
  },
  conversations: {
    displayName: "Conversations",
    description: "Message threads between homeowners and providers",
    essentialColumns: ["homeowner_profile_id", "provider_org_id", "last_message_at"],
    category: "Messaging",
  },
  messages: {
    displayName: "Messages",
    description: "Individual messages within conversations",
    essentialColumns: ["conversation_id", "sender_type", "content", "created_at"],
    category: "Messaging",
  },
  payments: {
    displayName: "Payments",
    description: "Payment transactions for client subscriptions",
    essentialColumns: ["client_subscription_id", "amount", "status", "payment_date"],
    category: "Finance",
  },
  accounting_transactions: {
    displayName: "Accounting Transactions",
    description: "Accounting entries for organizations",
    essentialColumns: ["organization_id", "type", "amount", "category", "transaction_date"],
    category: "Finance",
  },
  receipts: {
    displayName: "Receipts",
    description: "Uploaded receipts for accounting records",
    essentialColumns: ["organization_id", "vendor", "amount", "category", "receipt_date"],
    category: "Finance",
  },
  payroll_runs: {
    displayName: "Payroll Runs",
    description: "Payroll processing batches",
    essentialColumns: ["organization_id", "period_start", "period_end", "status", "total_amount"],
    category: "HR & Payroll",
  },
  payroll_items: {
    displayName: "Payroll Items",
    description: "Individual payroll entries for team members",
    essentialColumns: ["team_member_id", "payroll_run_id", "gross_pay", "net_pay", "status"],
    category: "HR & Payroll",
  },
  team_members: {
    displayName: "Team Members",
    description: "Organization staff and team member records",
    essentialColumns: ["organization_id", "invited_email", "team_role", "status"],
    category: "HR & Payroll",
  },
  team_member_compensation: {
    displayName: "Team Compensation",
    description: "Compensation and payment details for team members",
    essentialColumns: ["team_member_id", "pay_type", "pay_rate", "effective_date"],
    category: "HR & Payroll",
  },
  referral_profiles: {
    displayName: "Referral Profiles",
    description: "Referral tracking profiles for users",
    essentialColumns: ["referral_code", "referred_by_code", "role", "created_at"],
    category: "Marketing",
  },
  referral_events: {
    displayName: "Referral Events",
    description: "Individual referral signup events",
    essentialColumns: ["referrer_code", "referred_profile_id", "created_at"],
    category: "Marketing",
  },
  referral_stats: {
    displayName: "Referral Statistics",
    description: "Aggregated referral performance stats",
    essentialColumns: ["referrer_code", "total_referred", "eligible_referred"],
    category: "Marketing",
  },
  rewards_ledger: {
    displayName: "Rewards Ledger",
    description: "Reward credits earned through referrals",
    essentialColumns: ["profile_id", "reward_type", "amount", "role"],
    category: "Marketing",
  },
  fraud_checks: {
    displayName: "Fraud Checks",
    description: "Anti-fraud validation results",
    essentialColumns: ["referrer_code", "check_result", "reason", "created_at"],
    category: "Security",
  },
  admin_invites: {
    displayName: "Admin Invites",
    description: "Invitations for admin and moderator access",
    essentialColumns: ["email", "role", "status", "invited_at"],
    category: "Admin",
  },
  admin_activity_log: {
    displayName: "Admin Activity Log",
    description: "Audit log of admin actions",
    essentialColumns: ["admin_user_id", "action", "table_name", "created_at"],
    category: "Admin",
  },
  push_subscriptions: {
    displayName: "Push Subscriptions",
    description: "Push notification subscription endpoints",
    essentialColumns: ["user_id", "endpoint", "created_at"],
    category: "Notifications",
  },
};

export const TABLE_CATEGORIES = [
  "All Tables",
  "Users & Auth",
  "Providers",
  "Subscriptions",
  "Properties",
  "Services",
  "Messaging",
  "Finance",
  "HR & Payroll",
  "Marketing",
  "Security",
  "Admin",
  "Notifications",
];

export function formatColumnName(columnName: string): string {
  return columnName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
