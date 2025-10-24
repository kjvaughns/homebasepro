import { Button } from "@/components/ui/button";
import { Clock, ThumbsUp, DollarSign, Calendar } from "lucide-react";

interface QuickRepliesProps {
  onSelect: (message: string) => void;
}

export function QuickReplies({ onSelect }: QuickRepliesProps) {
  const quickReplies = [
    {
      icon: Clock,
      label: "Running late",
      message: "Running 5 minutes late, be there soon!",
    },
    {
      icon: ThumbsUp,
      label: "On my way",
      message: "On my way! Should arrive shortly.",
    },
    {
      icon: DollarSign,
      label: "Invoice sent",
      message: "Invoice sent! Please pay at your earliest convenience. Thank you!",
    },
    {
      icon: Calendar,
      label: "Confirm",
      message: "Confirmed! Looking forward to seeing you.",
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4">
      {quickReplies.map((reply, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelect(reply.message)}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <reply.icon className="h-4 w-4" />
          {reply.label}
        </Button>
      ))}
    </div>
  );
}
