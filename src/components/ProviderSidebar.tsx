import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  Briefcase,
  DollarSign,
  Star,
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

const navigationItems = [
  { to: "/provider/dashboard", title: "Dashboard", icon: Home },
  { to: "/provider/clients", title: "Clients", icon: Users },
  { to: "/provider/jobs", title: "Jobs", icon: Briefcase },
  { to: "/provider/payments", title: "Payments", icon: DollarSign },
  { to: "/provider/reviews", title: "Reviews", icon: Star },
  { to: "/provider/team", title: "Team", icon: Users },
  { to: "/provider/messages", title: "Messages", icon: MessageSquare },
  { to: "/provider/settings", title: "Settings", icon: Settings },
];

export function ProviderSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <div className="p-4 flex items-center justify-between border-b">
        {open && <h2 className="font-semibold text-lg">Provider Portal</h2>}
        <SidebarTrigger>
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-muted text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {open && <span>{item.title}</span>}
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
