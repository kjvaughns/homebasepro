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
    
    if (!address || typeof address !== 'string' || !address.trim()) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const addressTrimmed = address.trim();

    // Check cache first
    const { data: cached } = await supabase
      .from('property_lookups')
      .select('*')
      .ilike('address_input', addressTrimmed)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      console.log('Cache hit for address:', addressTrimmed);
      return new Response(
        JSON.stringify({
          address_std: cached.address_std,
          zip: cached.zip,
          home: {
            beds: cached.beds,
            baths: cached.baths,
            sqft: cached.sqft,
            lot_acres: cached.lot_acres,
            year_built: cached.year_built,
            zpid: cached.zpid
          },
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from RapidAPI Zillow
    const rapidApiKey = Deno.env.get('X_RapidAPI_Key');
    const rapidApiHost = Deno.env.get('X_RapidAPI_Host') || 'zillow-com1.p.rapidapi.com';

    if (!rapidApiKey) {
      throw new Error('RapidAPI key not configured');
    }

    const headers = {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': rapidApiHost,
    };

    // Step 1: Get ZPID from location search
    console.log('Searching for address:', addressTrimmed);
    const locRes = await fetch(
      `https://zillow-com1.p.rapidapi.com/locationSuggestions?term=${encodeURIComponent(addressTrimmed)}`,
      { headers }
    );

    if (!locRes.ok) {
      throw new Error(`Zillow location search failed: ${locRes.status}`);
    }

    const locData = await locRes.json();
    const firstResult = locData?.results?.[0];
    const zpid = firstResult?.id || firstResult?.zpid;

    if (!zpid) {
      return new Response(
        JSON.stringify({ 
          error: 'not_found', 
          message: 'No property found for that address' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get property details
    console.log('Fetching property details for ZPID:', zpid);
    const propRes = await fetch(
      `https://zillow-com1.p.rapidapi.com/property?zpid=${zpid}`,
      { headers }
    );

    if (!propRes.ok) {
      throw new Error(`Zillow property fetch failed: ${propRes.status}`);
    }

    const propData = await propRes.json();

    // Extract and normalize data
    const beds = propData?.bedrooms ?? null;
    const baths = propData?.bathrooms ?? null;
    const sqft = propData?.livingArea ?? null;
    const yearBuilt = propData?.yearBuilt ?? null;
    const lotVal = propData?.lotAreaValue ?? null;
    const lotUnit = (propData?.lotAreaUnit || '').toLowerCase();

    let lot_acres: number | null = null;
    if (lotVal) {
      if (lotUnit === 'acres') {
        lot_acres = Number(lotVal);
      } else if (lotUnit === 'sqft' || lotUnit === 'square feet') {
        lot_acres = Number(lotVal) / 43560;
      }
    }

    const addrObj = propData?.address || {};
    const zip = addrObj?.zipcode || addrObj?.zip || '';
    const formattedAddress = 
      [addrObj?.streetAddress, addrObj?.city, addrObj?.state, zip]
        .filter(Boolean)
        .join(', ') || addressTrimmed;

    // Cache the result
    await supabase.from('property_lookups').insert({
      address_input: addressTrimmed,
      address_std: formattedAddress,
      zpid: String(zpid),
      beds,
      baths,
      sqft,
      lot_acres: lot_acres ? Number(lot_acres.toFixed(2)) : null,
      year_built: yearBuilt,
      zip,
      raw_data: { loc: locData, prop: propData }
    });

    return new Response(
      JSON.stringify({
        address_std: formattedAddress,
        zip,
        home: {
          beds,
          baths,
          sqft,
          lot_acres: lot_acres ? Number(lot_acres.toFixed(2)) : null,
          year_built: yearBuilt,
          zpid: String(zpid)
        },
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-home:', error);
    return new Response(
      JSON.stringify({ 
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
