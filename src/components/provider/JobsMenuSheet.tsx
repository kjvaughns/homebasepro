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
      <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-3xl border-0 pb-safe">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-center text-base">Jobs</SheetTitle>
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
