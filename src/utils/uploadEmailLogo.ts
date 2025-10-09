import { supabase } from "@/integrations/supabase/client";

export const uploadEmailLogoToStorage = async () => {
  try {
    // Fetch the logo from public folder
    const response = await fetch('/homebase-email-logo.png');
    const blob = await response.blob();
    
    // Upload to avatars bucket
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload('homebase-email-logo.png', blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl('homebase-email-logo.png');

    console.log('Logo uploaded successfully! Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
};
