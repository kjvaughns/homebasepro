import { NavLink } from "react-router-dom";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export function ProviderSidebar() {
  const { open } = useSidebar();
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
    { to: "/provider/payments", title: "Payments", icon: DollarSign, showFor: "owner" },
    { to: "/provider/team", title: "Team", icon: Users, showFor: "owner" },
    { to: "/provider/messages", title: "Messages", icon: MessageSquare, showFor: "all" },
    { to: "/provider/settings", title: "Settings", icon: Settings, showFor: "all" },
  ];

  const filteredItems = navigationItems.filter(item => {
    if (item.showFor === "all") return true;
    if (item.showFor === "owner") return isOwner;
    if (item.showFor === "team") return isTeamMember;
    return false;
  });

  return (
    <Sidebar className={open ? "w-60 bg-black text-white" : "w-14 bg-black text-white"} collapsible="icon">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        {open && <h2 className="font-semibold text-base text-white">Provider Portal</h2>}
        <SidebarTrigger>
          <Menu className="h-5 w-5 text-white" />
        </SidebarTrigger>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/60 text-xs">Main</SidebarGroupLabel>
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
                          ? "bg-white/10 text-white font-medium hover:bg-white/15"
                          : "text-white/80 hover:bg-white/5"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {open && <span className="text-sm">{item.title}</span>}
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
