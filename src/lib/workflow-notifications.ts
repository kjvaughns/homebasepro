import { supabase } from "@/integrations/supabase/client";

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * Smart notification system that doesn't spam users
 */
export async function sendWorkflowNotification(
  userId: string,
  workflowId: string,
  stage: string,
  message: string
): Promise<void> {
  try {
    // Check if user wants notifications for this stage
    const preferences = await getUserNotificationPreferences(userId);
    
    // Check quiet hours
    if (isQuietHours(preferences)) {
      console.log('Skipping notification during quiet hours');
      return;
    }

    // Check if we already notified for this stage recently (avoid duplicates)
    const recentlyNotified = await checkRecentNotification(userId, workflowId, stage);
    if (recentlyNotified) {
      console.log('Already notified recently for this stage');
      return;
    }

    // Create notification record
    await supabase.from("notifications").insert({
      user_id: userId,
      title: `Workflow Update: ${formatStageLabel(stage)}`,
      body: message,
      type: 'workflow_update',
      url: `/homeowner/service-progress/${workflowId}`,
      read_at: null
    });

    // Send push notification if enabled
    if (preferences.push) {
      await sendPushNotification(userId, formatStageLabel(stage), message);
    }
  } catch (error) {
    console.error('Error sending workflow notification:', error);
  }
}

/**
 * Batch notifications for bulk operations
 */
export async function batchNotifyWorkflowUpdates(
  notifications: Array<{
    userId: string;
    workflowId: string;
    stage: string;
    message: string;
  }>
): Promise<void> {
  try {
    // Group by user to avoid spam
    const grouped = notifications.reduce((acc, notif) => {
      if (!acc[notif.userId]) acc[notif.userId] = [];
      acc[notif.userId].push(notif);
      return acc;
    }, {} as Record<string, typeof notifications>);

    // Send one notification per user with summary
    for (const [userId, userNotifs] of Object.entries(grouped)) {
      const message = userNotifs.length === 1
        ? userNotifs[0].message
        : `${userNotifs.length} workflow updates`;

      await sendWorkflowNotification(
        userId,
        userNotifs[0].workflowId,
        'batch_update',
        message
      );
    }
  } catch (error) {
    console.error('Error sending batch notifications:', error);
  }
}

/**
 * Get user notification preferences
 */
async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  // Default preferences - in future, these could be stored in a preferences table
  return {
    email: true,
    push: true,
    sms: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
  };
}

/**
 * Check if current time is during quiet hours
 */
function isQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (startTime < endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime <= endTime;
  }
}

/**
 * Check if user was notified for this workflow stage recently (within 1 hour)
 */
async function checkRecentNotification(
  userId: string,
  workflowId: string,
  stage: string
): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .like("url", `%${workflowId}%`)
      .like("title", `%${formatStageLabel(stage)}%`)
      .gte("created_at", oneHourAgo)
      .limit(1);

    if (error) throw error;

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking recent notification:', error);
    return false;
  }
}

/**
 * Send push notification
 */
async function sendPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    // Call edge function to send push notification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        title,
        body,
        tag: 'workflow-update'
      }
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Format stage label for display
 */
function formatStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    request_submitted: "Request Submitted",
    ai_analyzing: "AI Analyzing",
    providers_matched: "Providers Matched",
    quote_sent: "Quote Sent",
    diagnostic_scheduled: "Diagnostic Scheduled",
    diagnostic_completed: "Diagnostic Completed",
    quote_approved: "Quote Approved",
    job_scheduled: "Job Scheduled",
    job_in_progress: "Job In Progress",
    job_completed: "Job Completed",
    invoice_sent: "Invoice Sent",
    payment_received: "Payment Received",
    review_requested: "Review Requested",
    workflow_complete: "Complete",
    batch_update: "Multiple Updates"
  };

  return labels[stage] || stage;
}
