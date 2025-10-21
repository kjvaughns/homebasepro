import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Shield, Save } from "lucide-react";

interface Permission {
  key: string;
  category: string;
  description: string;
}

interface PermissionsEditorProps {
  teamMemberId: string;
  teamRole: string;
  onSuccess?: () => void;
}

export function PermissionsEditor({
  teamMemberId,
  teamRole,
  onSuccess,
}: PermissionsEditorProps) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [memberPermissions, setMemberPermissions] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPermissions();
  }, [teamMemberId]);

  const loadPermissions = async () => {
    try {
      // Load all available permissions
      const { data: permissions } = await supabase
        .from("team_permissions")
        .select("*")
        .order("category, key");

      if (permissions) {
        setAllPermissions(permissions);
      }

      // Load member's current permissions
      const { data: memberPerms } = await supabase
        .from("team_member_permissions")
        .select("permission_key, allowed")
        .eq("team_member_id", teamMemberId);

      const permsMap: { [key: string]: boolean } = {};
      memberPerms?.forEach((perm) => {
        permsMap[perm.permission_key] = perm.allowed;
      });
      setMemberPermissions(permsMap);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionKey: string) => {
    setMemberPermissions((prev) => ({
      ...prev,
      [permissionKey]: !prev[permissionKey],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing permissions for this member
      await supabase
        .from("team_member_permissions")
        .delete()
        .eq("team_member_id", teamMemberId);

      // Insert new permission set
      const permissionsToInsert = Object.entries(memberPermissions)
        .filter(([_, allowed]) => allowed)
        .map(([permission_key]) => ({
          team_member_id: teamMemberId,
          permission_key,
          allowed: true,
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from("team_member_permissions")
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      // Log audit trail
      await supabase.from("audit_log").insert({
        action: "permissions_updated",
        target_type: "team_member",
        target_id: teamMemberId,
        after_data: { permissions: memberPermissions },
      });

      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
      onSuccess?.();
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const applyRoleTemplate = () => {
    const templates: { [key: string]: string[] } = {
      owner: Object.keys(allPermissions.reduce((acc, p) => ({ ...acc, [p.key]: true }), {})),
      manager: [
        "jobs_read_all", "jobs_create", "jobs_edit", "jobs_cancel", "jobs_change_order",
        "payments_collect_onsite", "payments_add_tip", "payments_refund_request", "payments_view_fees",
        "team_invite", "team_edit_roles", "team_view_pay", "team_approve_time",
        "scheduling_create_shifts", "scheduling_edit_availability", "scheduling_override_ot",
        "messaging_broadcast", "messaging_client_dm",
        "assets_assign", "assets_view_maintenance",
      ],
      dispatcher: [
        "jobs_read_all", "jobs_edit",
        "scheduling_create_shifts", "scheduling_edit_availability",
        "messaging_broadcast", "messaging_client_dm",
      ],
      technician: [
        "jobs_read_own", "jobs_change_order",
        "payments_collect_onsite", "payments_add_tip",
        "scheduling_edit_availability",
      ],
      estimator: [
        "jobs_read_all", "jobs_create", "jobs_edit", "jobs_price_override",
        "payments_collect_onsite",
        "messaging_client_dm",
      ],
      accountant: [
        "jobs_read_all",
        "payments_view_fees", "payments_refund_request",
        "team_view_pay",
      ],
      support: [
        "jobs_read_all",
        "messaging_broadcast", "messaging_client_dm",
      ],
    };

    const template = templates[teamRole] || [];
    const newPermissions: { [key: string]: boolean } = {};
    allPermissions.forEach((perm) => {
      newPermissions[perm.key] = template.includes(perm.key);
    });
    setMemberPermissions(newPermissions);

    toast({
      title: "Template Applied",
      description: `Applied ${teamRole} role template`,
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading permissions...</div>;
  }

  const permissionsByCategory = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as { [category: string]: Permission[] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Permissions</h3>
          <Badge variant="secondary">{teamRole}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={applyRoleTemplate}>
            Apply Role Template
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Accordion type="multiple" className="w-full">
        {Object.entries(permissionsByCategory).map(([category, permissions]) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="capitalize">
              {category.replace("_", " ")} ({permissions.filter(p => memberPermissions[p.key]).length}/{permissions.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <Label
                        htmlFor={permission.key}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {permission.description}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {permission.key}
                      </p>
                    </div>
                    <Switch
                      id={permission.key}
                      checked={memberPermissions[permission.key] || false}
                      onCheckedChange={() => togglePermission(permission.key)}
                    />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}