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
  LayoutGrid,
  Wrench,
  Package,
  User,
  Share2,
  BarChart,
  CreditCard,
  Plug,
  Smartphone,
  FileText,
  Calendar,
  GitBranch,
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
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

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
    { to: "/provider/messages", title: "Messages", icon: MessageSquare, showFor: "all" },
    { to: "/provider/clients", title: "Clients", icon: Users, showFor: "owner" },
    { to: "/provider/quotes", title: "Quotes", icon: FileText, showFor: "owner" },
    { to: "/provider/service-calls", title: "Service Calls", icon: Calendar, showFor: "owner" },
    { 
      title: "Jobs & Services", 
      icon: Briefcase, 
      showFor: "owner",
      isGroup: true,
      items: [
        { to: "/provider/jobs", title: "Job Pipeline", icon: LayoutGrid },
        { to: "/provider/my-jobs", title: "My Jobs", icon: Briefcase },
        { to: "/provider/services", title: "Services", icon: Wrench },
        { to: "/provider/parts-materials", title: "Parts & Materials", icon: Package },
      ]
    },
    { to: "/provider/my-jobs", title: "My Jobs", icon: Briefcase, showFor: "team" },
    { to: "/provider/my-earnings", title: "My Earnings", icon: DollarSign, showFor: "team" },
    { 
      title: "Account", 
      icon: User, 
      showFor: "owner",
      isGroup: true,
      items: [
        { to: "/provider/account/profile", title: "Profile", icon: User },
        { to: "/provider/account/portfolio", title: "Portfolio", icon: Package },
        { to: "/provider/account/reviews", title: "Reviews", icon: TrendingUp },
        { to: "/provider/account/share-links", title: "Share Links", icon: Share2 },
        { to: "/provider/account/social", title: "Social Links", icon: Share2 },
      ]
    },
    { 
      title: "Financial", 
      icon: DollarSign, 
      showFor: "owner",
      isGroup: true,
      items: [
        { to: "/provider/payments", title: "Payments", icon: Receipt },
        { to: "/provider/accounting", title: "Accounting", icon: Receipt },
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
        { to: "/provider/earnings", title: "Earnings", icon: DollarSign },
        { to: "/provider/commission-rules", title: "Commission", icon: Percent },
      ]
    },
    { to: "/provider/analytics", title: "Analytics", icon: BarChart, showFor: "owner" },
    { 
      title: "Settings", 
      icon: Settings, 
      showFor: "owner",
      isGroup: true,
      items: [
        { to: "/provider/settings/billing", title: "Billing", icon: CreditCard },
        { to: "/provider/settings/payments", title: "Payments", icon: Wallet },
        { to: "/provider/settings/integrations", title: "Integrations", icon: Plug },
        { to: "/provider/settings/app", title: "App", icon: Smartphone },
      ]
    },
  ];

  const jobsRoutes = ['/provider/jobs', '/provider/my-jobs', '/provider/services', '/provider/parts-materials'];
  const accountRoutes = ['/provider/account'];
  const financialRoutes = ['/provider/payments', '/provider/accounting', '/provider/balance'];
  const teamRoutes = ['/provider/team', '/provider/time-tracking', '/provider/approve-time', '/provider/earnings', '/provider/commission-rules'];
  const settingsRoutes = ['/provider/settings'];
  
  const isJobsRouteActive = jobsRoutes.some(route => location.pathname.startsWith(route));
  const isAccountRouteActive = accountRoutes.some(route => location.pathname.startsWith(route));
  const isFinancialRouteActive = financialRoutes.some(route => location.pathname.startsWith(route));
  const isTeamRouteActive = teamRoutes.some(route => location.pathname.startsWith(route));
  const isSettingsRouteActive = settingsRoutes.some(route => location.pathname.startsWith(route));

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
                  const isGroupActive = 
                    item.title === "Jobs & Services" ? isJobsRouteActive :
                    item.title === "Team" ? isTeamRouteActive : 
                    item.title === "Settings" ? isSettingsRouteActive :
                    isFinancialRouteActive;
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
