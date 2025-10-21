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
      <SheetContent side="bottom" className="h-auto safe-bottom">
        <SheetHeader>
          <SheetTitle>Jobs</SheetTitle>
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
