import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, MessageCircle, Copy, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import QRCode from 'qrcode';

interface EnhancedShareButtonsProps {
  referralLink: string;
  userRole: 'provider' | 'homeowner';
  userName?: string;
}

export function EnhancedShareButtons({ 
  referralLink, 
  userRole,
  userName = 'a friend'
}: EnhancedShareButtonsProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const shareMessages = {
    provider: {
      sms: `Hey! I've been using HomeBase to run my business and it's been a game changer. You should check it out — get a free trial: ${referralLink}`,
      email: {
        subject: 'Check out HomeBase',
        body: `Hi there!\n\nI've been using HomeBase to manage my business and it's saved me hours every week. The platform helps with scheduling, payments, and client management all in one place.\n\nYou should give it a try — here's a link to sign up: ${referralLink}\n\nBest,\n${userName}`
      },
      social: `I've been using @HomeBase to streamline my business operations. If you're a service provider, you should check it out! ${referralLink}`
    },
    homeowner: {
      sms: `Hey! I found the best way to book trusted home services. Check out HomeBase and get $50 toward your first service: ${referralLink}`,
      email: {
        subject: 'You need to try HomeBase',
        body: `Hi!\n\nI wanted to share HomeBase with you — it's an amazing platform for booking home services from vetted local pros.\n\nI've used it for [plumbing/cleaning/landscaping] and it's been fantastic. Here's $50 toward your first booking: ${referralLink}\n\nLet me know what you think!\n\nBest,\n${userName}`
      },
      social: `Found the easiest way to manage home services! Booking trusted local pros on @HomeBase. Here's $50 off: ${referralLink}`
    }
  };

  const messages = shareMessages[userRole];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast.success('Link copied to clipboard!');
  };

  const handleSMS = () => {
    const encodedMessage = encodeURIComponent(messages.sms);
    window.location.href = `sms:?&body=${encodedMessage}`;
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(messages.email.subject);
    const body = encodeURIComponent(messages.email.body);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSocial = (platform: 'twitter' | 'facebook' | 'whatsapp' | 'linkedin') => {
    const encodedMessage = encodeURIComponent(messages.social);
    const encodedLink = encodeURIComponent(referralLink);
    
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedMessage}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`;
        break;
    }

    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleGenerateQR = async () => {
    try {
      const url = await QRCode.toDataURL(referralLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
      setShowQr(true);
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = 'homebase-referral-qr.png';
    link.href = qrCodeUrl;
    link.click();
    toast.success('QR code downloaded!');
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="default"
          className="w-full"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGenerateQR}
        >
          <QrCode className="h-4 w-4 mr-2" />
          QR Code
        </Button>
      </div>

      {/* QR Code Display */}
      {showQr && qrCodeUrl && (
        <Card>
          <CardContent className="p-4 flex flex-col items-center">
            <img src={qrCodeUrl} alt="Referral QR Code" className="w-48 h-48" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="mt-2"
            >
              Download QR Code
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Direct Share */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Share directly</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSMS}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            SMS
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleEmail}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>
      </div>

      {/* Social Media */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Share on social</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSocial('whatsapp')}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSocial('twitter')}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Twitter
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSocial('facebook')}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSocial('linkedin')}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </Button>
        </div>
      </div>

      {/* Suggested Message Preview */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Suggested message:
          </p>
          <p className="text-sm italic text-muted-foreground">
            "{messages.sms}"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
