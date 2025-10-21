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
    { title: "Payroll", href: "/provider/payroll", icon: DollarSign },
    { title: "Commission Rules", href: "/provider/commission-rules", icon: Percent },
  ];

  const handleNavigate = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-3xl border-0 pb-safe">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-center text-base">Team Management</SheetTitle>
        </SheetHeader>
        <div className="grid gap-1 py-2 px-2">
          {menuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-accent/50 active:bg-accent transition-colors text-left min-h-[56px]"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium text-base">{item.title}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
