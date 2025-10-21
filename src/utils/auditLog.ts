import { supabase } from "@/integrations/supabase/client";

interface AuditLogEntry {
  organizationId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  beforeData?: any;
  afterData?: any;
}

export async function logAuditEvent({
  organizationId,
  action,
  targetType,
  targetId,
  beforeData,
  afterData,
}: AuditLogEntry): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    // Get device info
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    // Get IP address (this will be null client-side, but Edge Functions can populate it)
    await (supabase as any).from("audit_log").insert({
      organization_id: organizationId,
      actor_user_id: user.user?.id,
      actor_name: user.user?.email,
      action,
      target_type: targetType,
      target_id: targetId,
      before_data: beforeData,
      after_data: afterData,
      device_info: deviceInfo,
    });
  } catch (error) {
    console.error("Error logging audit event:", error);
    // Don't throw - audit logging should not break the main flow
  }
}

export const AUDIT_ACTIONS = {
  // Team actions
  TEAM_MEMBER_INVITED: "team_member_invited",
  TEAM_MEMBER_ACCEPTED: "team_member_accepted",
  TEAM_MEMBER_SUSPENDED: "team_member_suspended",
  TEAM_MEMBER_REMOVED: "team_member_removed",
  TEAM_ROLE_CHANGED: "team_role_changed",
  TEAM_PERMISSIONS_UPDATED: "permissions_updated",
  
  // Compensation actions
  COMPENSATION_CREATED: "compensation_created",
  COMPENSATION_UPDATED: "compensation_updated",
  PAY_RATE_CHANGED: "pay_rate_changed",
  
  // Time tracking actions
  TIME_ENTRY_CREATED: "time_entry_created",
  TIME_ENTRY_APPROVED: "time_entry_approved",
  TIME_ENTRY_REJECTED: "time_entry_rejected",
  TIME_ENTRY_EDITED: "time_entry_edited",
  
  // Payroll actions
  PAYROLL_RUN_CREATED: "payroll_run_created",
  PAYROLL_RUN_PROCESSED: "payroll_run_processed",
  EARNINGS_CALCULATED: "earnings_calculated",
  
  // Asset actions
  ASSET_ASSIGNED: "asset_assigned",
  ASSET_UNASSIGNED: "asset_unassigned",
  
  // Settings actions
  OT_POLICY_CREATED: "ot_policy_created",
  OT_POLICY_UPDATED: "ot_policy_updated",
};