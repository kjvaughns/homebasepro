import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useMobileLayout } from "@/hooks/useMobileLayout";

interface Part {
  name: string;
  category: string;
  cost_price: number;
  markup_percentage: number;
  sell_price: number;
  unit: string;
  sku?: string;
}

interface AIPartsSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: Part[];
  onImport: (selectedParts: Part[]) => void;
  isLoading?: boolean;
}

export function AIPartsSuggestionDialog({
  open,
  onOpenChange,
  suggestions,
  onImport,
  isLoading = false,
}: AIPartsSuggestionDialogProps) {
  const { isMobile } = useMobileLayout();
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const togglePart = (index: number) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedParts(newSelected);
  };

  const selectAll = () => {
    setSelectedParts(new Set(suggestions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedParts(new Set());
  };

  const handleImport = async () => {
    setIsImporting(true);
    const partsToImport = suggestions.filter((_, i) => selectedParts.has(i));
    await onImport(partsToImport);
    setIsImporting(false);
    onOpenChange(false);
    setSelectedParts(new Set());
  };

  const content = (
    <>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">AI is generating parts suggestions...</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {suggestions.length} parts suggested • {selectedParts.size} selected
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Clear
              </Button>
            </div>
          </div>
          <ScrollArea className={isMobile ? "h-[50vh]" : "h-[400px]"}>
            <div className="space-y-2 pr-4">
              {suggestions.map((part, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors touch-manipulation"
                  onClick={() => togglePart(index)}
                >
                  <Checkbox
                    checked={selectedParts.has(index)}
                    onCheckedChange={() => togglePart(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{part.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{part.category}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-muted-foreground">
                        Cost: ${part.cost_price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        Markup: {part.markup_percentage}%
                      </span>
                      <span className="font-medium text-primary">
                        Sell: ${part.sell_price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </>
  );

  const footer = !isLoading && (
    <div className="flex gap-2 pt-4">
      <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
        Cancel
      </Button>
      <Button
        onClick={handleImport}
        disabled={selectedParts.size === 0 || isImporting}
        className="flex-1 min-h-[44px]"
      >
        {isImporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Import {selectedParts.size} Parts
          </>
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>AI Parts Suggestions</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{content}</div>
          <SheetFooter>{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Parts Suggestions</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
