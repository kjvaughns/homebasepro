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
  Star,
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

  const primaryNavigation = [
    { to: "/provider/dashboard", title: "Dashboard", icon: Home, showFor: "all" },
    { to: "/provider/schedule", title: "Schedule", icon: Calendar, showFor: "all" },
    { to: "/provider/money", title: "Money", icon: DollarSign, showFor: "all" },
    { to: "/provider/clients", title: "Clients", icon: Users, showFor: "all" },
  ];

  const accountNavigation = [
    { to: "/provider/services", title: "Services", icon: Wrench, showFor: "all" },
    { to: "/provider/account/portfolio", title: "Portfolio", icon: LayoutGrid, showFor: "all" },
    { to: "/provider/account/reviews", title: "Reviews", icon: Star, showFor: "all" },
    { to: "/provider/account/share-links", title: "Share Links", icon: Share2, showFor: "all" },
    { to: "/provider/settings", title: "Settings", icon: Settings, showFor: "all" },
  ];

  const filteredPrimary = primaryNavigation.filter(item => {
    if (item.showFor === "all") return true;
    if (item.showFor === "owner") return isOwner;
    if (item.showFor === "team") return isTeamMember;
    return false;
  });

  const filteredAccount = accountNavigation.filter(item => {
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
          {open && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredPrimary.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {open && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredAccount.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
