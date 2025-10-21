import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const linkId = pathParts[pathParts.length - 1];
    
    const format = url.searchParams.get('format') || 'png';
    const color = url.searchParams.get('color') || '#000000';

    // Get link details
    const { data: link, error } = await supabaseClient
      .from('short_links')
      .select('*, organizations!inner(*)')
      .eq('id', linkId)
      .single();

    if (error || !link) {
      return new Response(JSON.stringify({ error: 'Link not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Verify user owns the organization
    if (link.organizations.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const shortUrl = `https://${link.domain}/l/${link.slug}`;

    if (format === 'svg') {
      const qrSvg = await QRCode.toString(shortUrl, {
        type: 'svg',
        color: {
          dark: color,
          light: '#ffffff',
        },
        width: 300,
        margin: 2,
      });

      return new Response(qrSvg, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="${link.slug}-qr.svg"`,
        },
      });
    } else {
      const qrPng = await QRCode.toDataURL(shortUrl, {
        color: {
          dark: color,
          light: '#ffffff',
        },
        width: 300,
        margin: 2,
      });

      // Convert data URL to buffer
      const base64Data = qrPng.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      return new Response(buffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${link.slug}-qr.png"`,
        },
      });
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});