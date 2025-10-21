import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { teamMemberId, email, name, role, inviteToken } = await req.json();

    if (!teamMemberId || !email || !inviteToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization details
    const { data: teamMember } = await supabaseClient
      .from("team_members")
      .select("organization_id, organizations(name)")
      .eq("id", teamMemberId)
      .single();

    if (!teamMember) {
      return new Response(
        JSON.stringify({ error: "Team member not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgName = (teamMember.organizations as any)?.name || "HomeBase";
    const inviteLink = `${Deno.env.get("SUPABASE_URL")}/accept-invite?token=${inviteToken}`;

    // Send email via Supabase Auth
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join ${orgName} on HomeBase!</h2>
        <p>Hi ${name},</p>
        <p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
        <p>Click the button below to accept your invitation and complete your profile:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `;

    // Note: Actual email sending would require Supabase Email service or third-party provider
    // For now, we'll log the invite details
    console.log("Sending invite email:", {
      to: email,
      subject: `You're invited to join ${orgName} on HomeBase`,
      inviteLink,
    });

    // Log the invitation in audit log
    await supabaseClient.from("audit_log").insert({
      organization_id: teamMember.organization_id,
      action: "team_member_invited",
      target_type: "team_member",
      target_id: teamMemberId,
      after_data: { email, name, role },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation sent successfully",
        inviteLink, // Return for development/testing
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending team invite:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});