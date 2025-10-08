import { NavLink } from "react-router-dom";
import { LayoutDashboard, Database, Users, TrendingUp, Settings, Shield, Home, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminSidebar = () => {
  const navItems = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/data", icon: Database, label: "Data Browser" },
    { to: "/admin/analytics", icon: TrendingUp, label: "Analytics" },
    { to: "/admin/team", icon: Shield, label: "Team & Roles" },
    { to: "/admin/users", icon: Users, label: "User Management" },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const previewItems = [
    { to: "/dashboard", icon: Home, label: "Homeowner View" },
    { to: "/provider/dashboard", icon: UserCircle, label: "Provider View" },
  ];

  return (
    <aside className="w-64 border-r bg-card text-card-foreground">
      <div className="flex h-full flex-col">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold text-primary">Admin Portal</h2>
        </div>
        
        <nav className="flex-1 space-y-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="pt-6">
            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">PREVIEW MODES</p>
            {previewItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                target="_blank"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t p-4">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="h-5 w-5" />
            Back to Site
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
