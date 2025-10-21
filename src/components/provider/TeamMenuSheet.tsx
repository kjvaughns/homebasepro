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
      <SheetContent side="bottom" className="h-auto safe-bottom">
        <SheetHeader>
          <SheetTitle>Team Management</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 py-4">
          {menuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-accent transition-colors text-left min-h-[44px]"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{item.title}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
