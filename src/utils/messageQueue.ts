import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QueuedMessage {
  id: string;
  conversationId: string;
  senderProfileId: string;
  content: string;
  messageType: string;
  meta: any;
  attachmentUrl?: string;
  retries: number;
  timestamp: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;
  
  async enqueue(message: Omit<QueuedMessage, 'id' | 'retries' | 'timestamp'>) {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: crypto.randomUUID(),
      retries: 0,
      timestamp: Date.now()
    };
    
    this.queue.push(queuedMessage);
    
    if (!this.processing) {
      this.processQueue();
    }
    
    return queuedMessage.id;
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const message = this.queue[0];
      
      try {
        const { data, error } = await supabase.rpc('send_message', {
          p_conversation_id: message.conversationId,
          p_sender_profile_id: message.senderProfileId,
          p_content: message.content,
          p_message_type: message.messageType,
          p_meta: message.meta,
          p_attachment_url: message.attachmentUrl || null
        });
        
        if (error) throw error;
        
        // Success - remove from queue
        this.queue.shift();
      } catch (error) {
        console.error('Failed to send message:', error);
        message.retries++;
        
        if (message.retries >= 3) {
          // Give up after 3 retries
          this.queue.shift();
          toast.error('Failed to send message after 3 attempts');
        } else {
          // Retry with exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, 1000 * Math.pow(2, message.retries))
          );
        }
      }
    }
    
    this.processing = false;
  }
  
  getQueueLength(): number {
    return this.queue.length;
  }
}

export const messageQueue = new MessageQueue();
