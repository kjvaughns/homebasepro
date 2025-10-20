import { Button } from "@/components/ui/button";
import { Download, FileText, Link2, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DownloadButtonsProps {
  onDownloadPDF: () => void;
  onDownloadCSV?: () => void;
  shareLink?: string;
  trackingPrefix?: string;
}

export function DownloadButtons({ onDownloadPDF, onDownloadCSV, shareLink, trackingPrefix }: DownloadButtonsProps) {
  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={onDownloadPDF}
        variant="outline"
        size="lg"
        className="w-full justify-start"
        data-track={trackingPrefix ? `${trackingPrefix}_export_pdf` : undefined}
      >
        <FileText className="mr-2 h-5 w-5" />
        Download PDF
      </Button>
      
      {onDownloadCSV && (
        <Button
          onClick={onDownloadCSV}
          variant="outline"
          size="lg"
          className="w-full justify-start"
          data-track={trackingPrefix ? `${trackingPrefix}_export_csv` : undefined}
        >
          <Download className="mr-2 h-5 w-5" />
          Download CSV
        </Button>
      )}
      
      {shareLink && (
        <Button
          onClick={handleCopyLink}
          variant="outline"
          size="lg"
          className="w-full justify-start"
        >
          <Link2 className="mr-2 h-5 w-5" />
          Copy Share Link
        </Button>
      )}
    </div>
  );
}
