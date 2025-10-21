import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const slug = url.pathname.slice(1) || url.searchParams.get('slug');

    if (!slug) {
      return new Response('Not Found', { status: 404 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get link details
    const { data: link, error } = await supabaseAdmin
      .from('short_links')
      .select('*, organizations!inner(name, logo_url)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !link) {
      return new Response('Link not found', { status: 404 });
    }

    // Parse user agent for device type
    const userAgent = req.headers.get('user-agent') || '';
    let deviceType = 'desktop';
    if (/mobile|android|iphone/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    // Extract UTM parameters from URL
    const utmSource = url.searchParams.get('utm_source') || link.utm_source;
    const utmMedium = url.searchParams.get('utm_medium') || link.utm_medium;
    const utmCampaign = url.searchParams.get('utm_campaign') || link.utm_campaign;

    // Log click (async, don't wait)
    supabaseAdmin
      .from('short_link_clicks')
      .insert({
        short_link_id: link.id,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: userAgent,
        referrer: req.headers.get('referer'),
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        device_type: deviceType,
      })
      .then(() => console.log('Click logged'));

    // Build target URL with UTMs
    const targetUrl = new URL(link.target_url);
    if (utmSource) targetUrl.searchParams.set('utm_source', utmSource);
    if (utmMedium) targetUrl.searchParams.set('utm_medium', utmMedium);
    if (utmCampaign) targetUrl.searchParams.set('utm_campaign', utmCampaign);

    // Check if this is a bot/crawler
    const isBot = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|slackbot/i.test(userAgent);

    // Return HTML shim with OG tags for social previews
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${link.og_title || link.organizations.name}</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://${link.domain}/l/${link.slug}">
  <meta property="og:title" content="${link.og_title || `Book ${link.organizations.name}`}">
  <meta property="og:description" content="${link.og_description || `Schedule service with ${link.organizations.name} via HomeBase`}">
  <meta property="og:image" content="${link.og_image_url || link.organizations.logo_url}">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://${link.domain}/l/${link.slug}">
  <meta property="twitter:title" content="${link.og_title || `Book ${link.organizations.name}`}">
  <meta property="twitter:description" content="${link.og_description || `Schedule service with ${link.organizations.name}`}">
  <meta property="twitter:image" content="${link.og_image_url || link.organizations.logo_url}">
  
  <meta name="theme-color" content="${link.theme_color || '#1E40AF'}">
  <link rel="icon" href="${link.organizations.logo_url}">
  
  ${isBot ? `<meta http-equiv="refresh" content="2;url=${targetUrl.toString()}">` : ''}
  
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 0 auto 1rem;
      object-fit: cover;
      background: white;
    }
    .spinner {
      width: 40px;
      height: 40px;
      margin: 1rem auto;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    a {
      color: white;
      text-decoration: underline;
    }
  </style>
  
  <script>
    // Only redirect immediately if not a bot
    if (!/bot|crawler|spider|facebookexternalhit|twitterbot/i.test(navigator.userAgent)) {
      window.location.replace('${targetUrl.toString()}');
    }
  </script>
</head>
<body>
  <div class="container">
    <img src="${link.organizations.logo_url}" alt="${link.organizations.name}" class="logo" onerror="this.style.display='none'">
    <h1>${link.organizations.name}</h1>
    <div class="spinner"></div>
    <p>Redirecting to booking page...</p>
    <p><a href="${targetUrl.toString()}">Click here if not redirected</a></p>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in short-link-redirect:', error);
    return new Response('Error processing request', { status: 500 });
  }
});