import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { Briefcase, Wrench, Package } from "lucide-react";

interface JobsMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobsMenuSheet({ open, onOpenChange }: JobsMenuSheetProps) {
  const navigate = useNavigate();

  const menuItems = [
    { title: "Job Pipeline", href: "/provider/jobs", icon: Briefcase },
    { title: "Services", href: "/provider/services", icon: Wrench },
    { title: "Parts & Materials", href: "/provider/parts-materials", icon: Package },
  ];

  const handleNavigate = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[40vh] rounded-t-3xl border-0 pb-safe">
        <SheetHeader className="pb-1">
          <SheetTitle className="text-center text-sm font-semibold">Jobs</SheetTitle>
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
