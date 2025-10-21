import { useState, useRef, useCallback } from "react";
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

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    
    // Typing indicator
    onTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 3000);
  }, [onTyping]);

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
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-lg pb-safe">
      <div className="px-4 py-3">
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
            className="h-11 w-11 flex-shrink-0 rounded-full"
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
            placeholder="Type a message..."
            className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl"
            rows={1}
            disabled={sending}
          />
        
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            size="icon"
            className="h-11 w-11 flex-shrink-0 rounded-full"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}