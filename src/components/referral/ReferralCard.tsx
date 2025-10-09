import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralCardProps {
  referralLink: string;
}

export function ReferralCard({ referralLink }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join HomeBase Club',
          text: 'Join me on HomeBase and get exclusive rewards!',
          url: referralLink
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          await handleCopy();
        }
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Your unique referral link
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-4 py-3">
              <code className="text-sm break-all">{referralLink}</code>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleCopy} 
            className="flex-1"
            variant={copied ? "secondary" : "default"}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
          <Button 
            onClick={handleShare} 
            variant="outline"
            className="flex-1"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
