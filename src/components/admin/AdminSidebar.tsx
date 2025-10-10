import { NavLink } from "react-router-dom";
import { LayoutDashboard, Database, Users, TrendingUp, Settings, Shield, Home, UserCircle, DollarSign, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminSidebar = () => {
  const navItems = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/analytics", icon: TrendingUp, label: "Analytics & Revenue" },
    { to: "/admin/commerce", icon: DollarSign, label: "Commerce" },
    { to: "/admin/users-access", icon: Users, label: "Users & Access" },
    { to: "/admin/data", icon: Database, label: "Data Browser" },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const previewItems = [
    { to: "/dashboard", icon: Home, label: "Homeowner View" },
    { to: "/provider/dashboard", icon: UserCircle, label: "Provider View" },
  ];

  return (
    <aside className="w-64 border-r bg-card text-card-foreground h-full">
      <div className="flex h-full flex-col">
        <div className="border-b p-4 lg:p-6 hidden lg:block">
          <h2 className="text-xl lg:text-2xl font-bold text-primary">Admin Portal</h2>
        </div>
        <div className="border-b p-4 lg:hidden">
          <h2 className="text-xl font-bold text-primary">Menu</h2>
        </div>
        
        <nav className="flex-1 space-y-1 p-3 lg:p-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="pt-4 lg:pt-6">
            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview Modes</p>
            {previewItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                target="_blank"
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t p-3 lg:p-4">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
            <span className="truncate">Back to Site</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
