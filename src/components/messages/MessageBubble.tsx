import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface MessageBubbleProps {
  message: any;
  isSender: boolean;
}

export function MessageBubble({ message, isSender }: MessageBubbleProps) {
  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 ${
          isSender
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {message.meta?.card && (
          <MessageCard card={message.meta.card} />
        )}
        
        {message.message_type === "image" && (message.attachment_url || message.meta?.url) && (
          <div className="group relative">
            <img
              src={message.attachment_url || message.meta?.url}
              alt={message.meta?.name || "Image"}
              className="rounded-xl mb-1 max-w-full h-auto max-h-[300px] object-cover cursor-pointer"
              onClick={() => window.open(message.attachment_url || message.meta?.url, '_blank')}
              loading="lazy"
            />
            {message.meta?.name && (
              <p className="text-xs opacity-60 mt-1">{message.meta.name}</p>
            )}
          </div>
        )}
        
        {message.message_type === "file" && (message.attachment_url || message.meta?.url) && (
          <a
            href={message.attachment_url || message.meta?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/50"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.meta?.name || message.attachment_metadata?.name || "Download file"}
              </p>
              {(message.meta?.size || message.attachment_metadata?.size) && (
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(message.meta?.size || message.attachment_metadata?.size)}
                </p>
              )}
            </div>
            <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-50" />
          </a>
        )}
        
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        )}
        
        <p
          className={`text-[10px] mt-1 ${
            isSender ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function MessageCard({ card }: { card: any }) {
  if (card.type === 'quote') {
    return (
      <Card className="bg-background/90 border border-border/50 mb-2">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Quote</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="text-sm font-medium">{card.service_name}</div>
          <div className="text-lg font-bold">${card.low}–${card.high}</div>
          {card.note && <div className="text-xs text-muted-foreground">{card.note}</div>}
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs">View</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (card.type === 'job') {
    return (
      <Card className="bg-background/90 border border-border/50 mb-2">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Job</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="text-sm font-medium">{card.service_name}</div>
          <div className="text-xs text-muted-foreground">{card.address}</div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs">Open Job</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (card.type === 'invoice') {
    return (
      <Card className="bg-background/90 border border-border/50 mb-2">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Invoice</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="text-sm">Amount Due</div>
          <div className="text-lg font-bold">${card.amount}</div>
          <div className="text-xs text-muted-foreground">{card.status || 'Unpaid'}</div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs">View & Pay</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return null;
}