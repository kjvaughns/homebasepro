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
    { to: "/provider/schedule", title: "Schedule", icon: Calendar, showFor: "all" },
    { to: "/provider/money", title: "Money", icon: DollarSign, showFor: "all" },
    { to: "/provider/clients", title: "Clients", icon: Users, showFor: "all" },
    { to: "/provider/more", title: "More", icon: Menu, showFor: "all" },
  ];

  // Simplified navigation - no route groups needed

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
              {filteredItems.map((item) => (
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
