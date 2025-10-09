import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, DollarSign } from "lucide-react";

interface TeamMemberCardProps {
  member: {
    id: string;
    invited_email: string;
    role: string;
    team_role: string;
    status: string;
    permissions: any;
  };
  compensation?: {
    pay_type: string;
    pay_rate: number;
    direct_deposit_enabled: boolean;
  };
  onManageCompensation: () => void;
  onManagePermissions: () => void;
}

export function TeamMemberCard({ 
  member, 
  compensation,
  onManageCompensation,
  onManagePermissions 
}: TeamMemberCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{member.invited_email}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="capitalize">
                {member.team_role?.replace("_", " ")}
              </Badge>
              <Badge variant={member.status === "active" ? "default" : "secondary"}>
                {member.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {compensation && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted-foreground">Pay Rate:</span>
              <span className="font-semibold">
                ${compensation.pay_rate}/{compensation.pay_type === "hourly" ? "hr" : "yr"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Direct Deposit:</span>
              <Badge variant={compensation.direct_deposit_enabled ? "default" : "outline"} className="text-xs">
                {compensation.direct_deposit_enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onManageCompensation}
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Compensation
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onManagePermissions}
          >
            <Settings className="h-3 w-3 mr-1" />
            Permissions
          </Button>
        </div>

        <div className="hidden lg:block">
          <p className="text-xs text-muted-foreground mb-2">Permissions:</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(member.permissions || {}).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-primary' : 'bg-muted'}`} />
                <span className="capitalize truncate">{key.replace("can_", "").replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}