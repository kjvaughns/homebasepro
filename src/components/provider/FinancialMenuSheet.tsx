import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { CreditCard, FileText, BarChart3, Wallet } from "lucide-react";

interface FinancialMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinancialMenuSheet({ open, onOpenChange }: FinancialMenuSheetProps) {
  const navigate = useNavigate();

  const menuItems = [
    { title: "Payments", href: "/provider/payments", icon: CreditCard },
    { title: "Accounting", href: "/provider/accounting", icon: FileText },
    { title: "Analytics", href: "/provider/analytics", icon: BarChart3 },
    { title: "Balance", href: "/provider/balance", icon: Wallet },
  ];

  const handleNavigate = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto safe-bottom">
        <SheetHeader>
          <SheetTitle>Financial</SheetTitle>
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
