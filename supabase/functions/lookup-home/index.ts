import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address || typeof address !== 'string' || address.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'invalid_input', message: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const googleMapsKey = Deno.env.get('google_maps');

    if (!googleMapsKey) {
      console.error('Google Maps API key not configured');
      return new Response(
        JSON.stringify({ error: 'config_error', message: 'Property lookup not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const addressLower = address.toLowerCase().trim();

    // Check cache
    const { data: cached } = await supabase
      .from('property_lookups')
      .select('*')
      .ilike('address_input', addressLower)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return new Response(
        JSON.stringify({
          address_std: cached.address_std,
          zip: cached.zip,
          beds: cached.beds,
          baths: cached.baths,
          sqft: cached.sqft,
          lot_acres: cached.lot_acres,
          year_built: cached.year_built,
          lat: cached.raw_data?.lat,
          lng: cached.raw_data?.lng,
          city: cached.raw_data?.city,
          state: cached.raw_data?.state,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Google Geocoding
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsKey}`
    );

    const geoData = await geoRes.json();
    if (geoData.status !== 'OK' || !geoData.results?.length) {
      return new Response(
        JSON.stringify({ error: 'not_found', message: 'Address not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const best = geoData.results[0];
    const components = best.address_components || [];
    const getComp = (types: string[]) => components.find((c: any) => types.some((t: string) => c.types?.includes(t)));
    
    const zip = getComp(['postal_code'])?.long_name || '';
    const city = getComp(['locality', 'sublocality'])?.long_name || '';
    const state = getComp(['administrative_area_level_1'])?.short_name || '';
    const lat = best.geometry?.location?.lat;
    const lng = best.geometry?.location?.lng;
    const addressStd = best.formatted_address;

    await supabase.from('property_lookups').insert({
      address_input: addressLower,
      address_std: addressStd,
      zip,
      raw_data: { lat, lng, city, state }
    });

    return new Response(
      JSON.stringify({ address_std: addressStd, zip, lat, lng, city, state }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-home:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
