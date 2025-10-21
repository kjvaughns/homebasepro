import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { Users, Clock, CheckCircle, DollarSign, Percent } from "lucide-react";

interface TeamMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamMenuSheet({ open, onOpenChange }: TeamMenuSheetProps) {
  const navigate = useNavigate();

  const menuItems = [
    { title: "Team Members", href: "/provider/team", icon: Users },
    { title: "Time Tracking", href: "/provider/time-tracking", icon: Clock },
    { title: "Approve Time", href: "/provider/approve-time", icon: CheckCircle },
    { title: "Earnings Ledger", href: "/provider/earnings", icon: DollarSign },
    { title: "Commission Rules", href: "/provider/commission-rules", icon: Percent },
  ];

  const handleNavigate = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[40vh] rounded-t-3xl border-0 pb-safe">
        <SheetHeader className="pb-1">
          <SheetTitle className="text-center text-sm font-semibold">Team Management</SheetTitle>
        </SheetHeader>
        <div className="grid gap-0.5 py-1 px-3">
          {menuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 active:bg-accent transition-colors text-left min-h-[48px]"
            >
              <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-sm">{item.title}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
