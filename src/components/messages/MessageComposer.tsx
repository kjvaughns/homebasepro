import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Mic, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

interface MessageComposerProps {
  conversationId: string;
  profileId: string;
  onSend: (content: string, type?: string, meta?: any) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  onFocus?: () => void;
  onHeightChange?: (height: number) => void;
}

export function MessageComposer({ conversationId, profileId, onSend, onTyping, onFocus, onHeightChange }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const keyboardHeight = useKeyboardHeight();

  // Measure composer height and notify parent
  useEffect(() => {
    if (!composerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        onHeightChange?.(height);
      }
    });

    resizeObserver.observe(composerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [onHeightChange]);

  // Auto-resize textarea
  const handleTextareaResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 128); // Max 128px
    textarea.style.height = `${newHeight}px`;
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    handleTextareaResize();
    
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
  }, [onTyping, handleTextareaResize]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    
    setSending(true);
    const content = text.trim();
    setText("");
    onTyping(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
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
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file, { upsert: false });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        // Check for RLS policy violation
        if (uploadError.message?.includes('row-level security') || 
            uploadError.message?.includes('policy')) {
          toast.error('Upload failed: You do not have permission to upload files to this conversation');
        } else if (uploadError.message?.includes('duplicate')) {
          toast.error('A file with this name already exists');
        } else {
          toast.error(`Upload failed: ${uploadError.message}`);
        }
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);
      
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      
      // Include file metadata in meta field
      await onSend('', messageType, {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        fileName: fileName
      });
      
      toast.success(`${messageType === 'image' ? 'Photo' : 'File'} sent`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file. Please try again.');
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

  const handleFocus = () => {
    setTimeout(() => {
      onFocus?.();
    }, 0);
  };

  return (
    <div 
      ref={composerRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-lg"
      style={{
        bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 12px)`,
        paddingTop: '12px',
        transition: 'bottom 0.2s ease-out',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)'
      }}
    >
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
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Type a message..."
            className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl overflow-hidden"
            rows={1}
            disabled={sending}
            inputMode="text"
            autoCapitalize="sentences"
            autoCorrect="on"
            enterKeyHint="send"
            style={{ fontSize: '16px' }}
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