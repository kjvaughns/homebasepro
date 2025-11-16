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
    { title: "Money Owed", href: "/provider/money?tab=owed", icon: FileText },
    { title: "Money Received", href: "/provider/money?tab=received", icon: CreditCard },
    { title: "Summary", href: "/provider/money?tab=summary", icon: BarChart3 },
    { title: "Stripe Balance", href: "/provider/balance", icon: Wallet },
  ];

  const handleNavigate = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[40vh] rounded-t-3xl border-0 pb-safe">
        <SheetHeader className="pb-1">
          <SheetTitle className="text-center text-sm font-semibold">Financial</SheetTitle>
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
