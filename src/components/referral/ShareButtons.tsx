import { Button } from '@/components/ui/button';
import { Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ShareButton } from '@/components/native/ShareButton';

interface ShareButtonsProps {
  referralLink: string;
  shareText?: string;
}

export function ShareButtons({ referralLink, shareText = 'Join me on HomeBase!' }: ShareButtonsProps) {
  const encodedText = encodeURIComponent(shareText);
  const encodedLink = encodeURIComponent(referralLink);

  const handleSMS = () => {
    const smsLink = `sms:?&body=${encodedText}%20${encodedLink}`;
    window.location.href = smsLink;
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Join HomeBase Club');
    const body = encodeURIComponent(`${shareText}\n\n${referralLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSocial = (platform: 'twitter' | 'facebook' | 'linkedin') => {
    let url = '';
    
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`;
        break;
    }

    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Share via</p>
      
      <div className="grid grid-cols-2 gap-2">
        <ShareButton 
          message={shareText}
          url={referralLink}
          variant="default"
          size="default"
        />

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSMS}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          SMS
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleEmail}
        >
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocial('twitter')}
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Twitter
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocial('facebook')}
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </Button>
      </div>
    </div>
  );
}
