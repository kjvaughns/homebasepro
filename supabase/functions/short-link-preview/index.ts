import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get link details
    const { data: link, error } = await supabaseAdmin
      .from('short_links')
      .select('*, organizations(name, logo_url, business_description)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !link) {
      console.error('Link not found:', error);
      return new Response(JSON.stringify({ error: 'Link not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const provider = link.organizations;
    const ogTitle = link.og_title || `Book ${provider.name} on HomeBase`;
    const ogDescription = link.og_description || provider.business_description || `Schedule service with ${provider.name}. View availability and book instantly.`;
    const ogImage = link.og_image_url || provider.logo_url || 'https://homebaseproapp.com/og-image.png';

    // Return meta data for preview
    return new Response(JSON.stringify({
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      providerName: provider.name,
      url: `https://homebaseproapp.com/l/${slug}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in short-link-preview:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
