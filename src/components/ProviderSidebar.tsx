import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  DollarSign,
  UserPlus,
  Settings,
  Menu,
  MessageSquare,
  TrendingUp,
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
  { title: "Overview", url: "/provider/dashboard", icon: LayoutDashboard },
  { title: "Clients", url: "/provider/clients", icon: Users },
  { title: "Service Plans", url: "/provider/plans", icon: Package },
  { title: "Subscriptions", url: "/provider/subscriptions", icon: CreditCard },
  { title: "Payments", url: "/provider/payments", icon: DollarSign },
  { title: "Accounting", url: "/provider/accounting", icon: TrendingUp },
  { title: "Messages", url: "/provider/messages", icon: MessageSquare },
  { title: "Team", url: "/provider/team", icon: UserPlus },
  { title: "Settings", url: "/provider/settings", icon: Settings },
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
                      to={item.url}
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
