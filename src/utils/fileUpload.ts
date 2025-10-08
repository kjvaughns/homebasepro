import { supabase } from "@/integrations/supabase/client";

export interface UploadedFile {
  url: string;
  path: string;
  metadata: {
    filename: string;
    size: number;
    mimeType: string;
  };
}

export const uploadMessageAttachment = async (
  file: File,
  conversationId: string
): Promise<UploadedFile> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('message-attachments')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('message-attachments')
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
    metadata: {
      filename: file.name,
      size: file.size,
      mimeType: file.type
    }
  };
};

export const getAttachmentUrl = (path: string): string => {
  const { data: { publicUrl } } = supabase.storage
    .from('message-attachments')
    .getPublicUrl(path);
  return publicUrl;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
