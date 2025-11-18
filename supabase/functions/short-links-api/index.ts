import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'www', 'mail', 'help', 'support', 'login', 'signup',
  'dashboard', 'settings', 'profile', 'home', 'about', 'contact', 'terms', 'privacy'
];

const ALLOWED_DOMAINS = [
  'app.homebaseproapp.com',
  'localhost:8080',
  'localhost:5173',
  'localhost:3000'
];

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

    // POST /short-links-api - Create new link
    if (req.method === 'POST') {
      const body = await req.json();
      const { org_id, slug, target_url, utm_source, utm_medium, utm_campaign } = body;

      // Validate slug
      if (!slug || !/^[a-z0-9-]{3,32}$/.test(slug)) {
        return new Response(
          JSON.stringify({ error: 'Slug must be 3-32 characters, lowercase letters, numbers, and hyphens only' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      if (RESERVED_SLUGS.includes(slug)) {
        return new Response(
          JSON.stringify({ error: 'This slug is reserved' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Validate target URL
      const targetUrl = new URL(target_url);
      const isAllowedDomain = ALLOWED_DOMAINS.some(domain => targetUrl.hostname === domain) ||
                              targetUrl.hostname.endsWith('.lovableproject.com');
      
      if (!isAllowedDomain) {
        return new Response(
          JSON.stringify({ error: 'Invalid target domain' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check user owns org
      const { data: org } = await supabaseClient
        .from('organizations')
        .select('id, name, logo_url')
        .eq('id', org_id)
        .eq('owner_id', user.id)
        .single();

      if (!org) {
        return new Response(
          JSON.stringify({ error: 'Organization not found or unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      // Check link limit (10 active links per org)
      const { count } = await supabaseClient
        .from('short_links')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org_id)
        .eq('is_active', true);

      if (count && count >= 10) {
        return new Response(
          JSON.stringify({ error: 'Maximum of 10 active links reached' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if slug is available
      const { data: existing } = await supabaseClient
        .from('short_links')
        .select('id')
        .eq('slug', slug)
        .eq('domain', 'app.homebaseproapp.com')
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Slug already taken' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }

      // Create link
      const { data: link, error } = await supabaseClient
        .from('short_links')
        .insert({
          org_id,
          slug,
          target_url,
          og_title: `Book ${org.name} | HomeBase`,
          og_description: `Schedule service with ${org.name} via HomeBase`,
          og_image_url: org.logo_url,
          utm_source,
          utm_medium,
          utm_campaign,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify(link), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // PATCH /short-links-api/:id - Update link
    if (req.method === 'PATCH' && pathParts.length === 2) {
      const linkId = pathParts[1];
      const body = await req.json();

      const { data: link, error } = await supabaseClient
        .from('short_links')
        .update(body)
        .eq('id', linkId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify(link), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /short-links-api/:id - Soft delete link
    if (req.method === 'DELETE' && pathParts.length === 2) {
      const linkId = pathParts[1];

      const { error } = await supabaseClient
        .from('short_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /short-links-api/check-slug/:slug - Check availability
    if (req.method === 'GET' && pathParts[1] === 'check-slug') {
      const slug = pathParts[2];

      if (RESERVED_SLUGS.includes(slug)) {
        return new Response(
          JSON.stringify({ available: false, reason: 'reserved' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data } = await supabaseClient
        .from('short_links')
        .select('id')
        .eq('slug', slug)
        .eq('domain', 'app.homebaseproapp.com')
        .single();

      return new Response(
        JSON.stringify({ available: !data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /short-links-api/:id/analytics - Get click stats
    if (req.method === 'GET' && pathParts.length === 3 && pathParts[2] === 'analytics') {
      const linkId = pathParts[1];

      const { data: clicks } = await supabaseClient
        .from('short_link_clicks')
        .select('*')
        .eq('short_link_id', linkId)
        .order('clicked_at', { ascending: false });

      return new Response(JSON.stringify(clicks || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});