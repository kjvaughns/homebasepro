import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Mic, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MessageComposerProps {
  conversationId: string;
  profileId: string;
  onSend: (content: string, type?: string, meta?: any) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

export function MessageComposer({ conversationId, profileId, onSend, onTyping }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const handleTextChange = (value: string) => {
    setText(value);
    
    // Typing indicator
    onTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 1500);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    
    setSending(true);
    const content = text.trim();
    setText("");
    onTyping(false);
    
    try {
      await onSend(content, 'text');
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send message');
      setText(content); // Restore text on error
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);
      
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      await onSend('', messageType, {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      toast.success('File sent');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-background border-t border-border p-3 safe-bottom">
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
        
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>
        
        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
        
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          size="icon"
          className="h-10 w-10 flex-shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Image</span>
        </button>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Mic className="h-3.5 w-3.5" />
          <span>Voice</span>
        </button>
      </div>
    </div>
  );
}