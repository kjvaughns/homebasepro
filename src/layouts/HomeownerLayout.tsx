import { Home, Search, Calendar, Settings, MessageSquare } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Browse", href: "/homeowner/browse", icon: Search },
  { name: "Services", href: "/homeowner/subscriptions", icon: Calendar },
  { name: "Settings", href: "/homeowner/settings", icon: Settings },
];

export default function HomeownerLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="font-semibold text-lg">
              HouseMate
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback>HO</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("pb-20 md:pb-0", isMobile ? "container py-4" : "pl-64") }>
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile) */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
          <div className="flex items-center justify-around h-16">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Sidebar (Desktop) */}
      {!isMobile && (
        <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r bg-background">
          <nav className="flex flex-col gap-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}
    </div>
  );
}
