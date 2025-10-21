import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  Users,
  Briefcase,
  DollarSign,
  MessageSquare,
  Settings,
  Menu,
  Clock,
  CheckCircle,
  Percent,
  ChevronRight,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function ProviderSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const [isOwner, setIsOwner] = useState(true);
  const [isTeamMember, setIsTeamMember] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user owns an organization
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    // Check if user is a team member
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .single();

    setIsOwner(!!org);
    setIsTeamMember(!!teamMember && !org);
  };

  const navigationItems = [
    { to: "/provider/dashboard", title: "Dashboard", icon: Home, showFor: "all" },
    { to: "/provider/clients", title: "Clients", icon: Users, showFor: "owner" },
    { to: "/provider/jobs", title: "Jobs", icon: Briefcase, showFor: "owner" },
    { to: "/provider/my-jobs", title: "My Jobs", icon: Briefcase, showFor: "team" },
    { to: "/provider/my-earnings", title: "My Earnings", icon: DollarSign, showFor: "team" },
    { 
      title: "Financial", 
      icon: DollarSign, 
      showFor: "owner",
      isGroup: true,
      items: [
        { to: "/provider/payments", title: "Payments", icon: Receipt },
        { to: "/provider/accounting", title: "Accounting", icon: Receipt },
        { to: "/provider/analytics", title: "Analytics", icon: TrendingUp },
        { to: "/provider/balance", title: "Balance", icon: Wallet },
      ]
    },
    { 
      title: "Team", 
      icon: Users, 
      showFor: "owner",
      isGroup: true,
      items: [
        { to: "/provider/team", title: "Team Members", icon: Users },
        { to: "/provider/time-tracking", title: "Time Tracking", icon: Clock },
        { to: "/provider/approve-time", title: "Approve Time", icon: CheckCircle },
        { to: "/provider/payroll", title: "Payroll", icon: DollarSign },
        { to: "/provider/commission-rules", title: "Commission", icon: Percent },
      ]
    },
    { to: "/provider/messages", title: "Messages", icon: MessageSquare, showFor: "all" },
    { to: "/provider/settings", title: "Settings", icon: Settings, showFor: "all" },
  ];

  const financialRoutes = ['/provider/payments', '/provider/accounting', '/provider/analytics', '/provider/balance'];
  const teamRoutes = ['/provider/team', '/provider/time-tracking', '/provider/approve-time', '/provider/payroll', '/provider/commission-rules'];
  const isFinancialRouteActive = financialRoutes.some(route => location.pathname.startsWith(route));
  const isTeamRouteActive = teamRoutes.some(route => location.pathname.startsWith(route));

  const filteredItems = navigationItems.filter(item => {
    if (item.showFor === "all") return true;
    if (item.showFor === "owner") return isOwner;
    if (item.showFor === "team") return isTeamMember;
    return false;
  });

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <div className="p-4 flex items-center justify-between border-b">
        {open && <h2 className="font-semibold text-base">Provider Portal</h2>}
        <SidebarTrigger>
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                if (item.isGroup) {
                  const isGroupActive = item.title === "Team" ? isTeamRouteActive : isFinancialRouteActive;
                  return (
                    <Collapsible
                      key={item.title}
                      defaultOpen={isGroupActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                            <item.icon className="h-5 w-5" />
                            {open && <span className="text-sm ml-3">{item.title}</span>}
                            {open && <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink
                                    to={subItem.to}
                                    end
                                    className={({ isActive }) =>
                                      isActive
                                        ? "bg-secondary text-foreground font-medium rounded-lg"
                                        : "text-foreground hover:bg-muted/50 rounded-lg"
                                    }
                                  >
                                    <subItem.icon className="h-4 w-4" />
                                    {open && <span className="text-sm ml-3">{subItem.title}</span>}
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.to}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-secondary text-foreground font-medium rounded-lg"
                            : "text-foreground hover:bg-muted/50 rounded-lg"
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span className="text-sm ml-3">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
