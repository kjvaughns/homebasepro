import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate distance between two lat/lng points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple nearest neighbor TSP heuristic
function optimizeRoute(jobs: any[]): any[] {
  if (jobs.length <= 1) return jobs;

  const unvisited = [...jobs];
  const route = [];
  
  // Start with first job
  let current = unvisited.shift()!;
  route.push(current);

  // Find nearest neighbor iteratively
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const distance = calculateDistance(
        current.lat,
        current.lng,
        unvisited[i].lat,
        unvisited[i].lng
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    current = unvisited.splice(nearestIndex, 1)[0];
    route.push(current);
  }

  return route;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobIds } = await req.json();

    if (!jobIds || jobIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Job IDs required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🗺️ Optimizing route for ${jobIds.length} jobs`);

    // Fetch jobs with lat/lng
    const { data: jobs, error: fetchError } = await supabase
      .from('bookings')
      .select('id, service_name, address, lat, lng, route_order')
      .in('id', jobIds)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (fetchError) throw fetchError;

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No jobs with coordinates found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate original total distance
    let originalDistance = 0;
    for (let i = 0; i < jobs.length - 1; i++) {
      originalDistance += calculateDistance(
        jobs[i].lat,
        jobs[i].lng,
        jobs[i + 1].lat,
        jobs[i + 1].lng
      );
    }

    // Optimize route
    const optimizedJobs = optimizeRoute(jobs);

    // Calculate optimized distance
    let optimizedDistance = 0;
    for (let i = 0; i < optimizedJobs.length - 1; i++) {
      optimizedDistance += calculateDistance(
        optimizedJobs[i].lat,
        optimizedJobs[i].lng,
        optimizedJobs[i + 1].lat,
        optimizedJobs[i + 1].lng
      );
    }

    // Update route_order in database
    for (let i = 0; i < optimizedJobs.length; i++) {
      await supabase
        .from('bookings')
        .update({ route_order: i + 1 })
        .eq('id', optimizedJobs[i].id);
    }

    const distanceSaved = originalDistance - optimizedDistance;
    const timeSaved = Math.round((distanceSaved / 30) * 60); // Assuming 30 mph average

    console.log(`✅ Route optimized! Distance saved: ${distanceSaved.toFixed(1)} miles`);

    return new Response(
      JSON.stringify({
        success: true,
        optimizedRoute: optimizedJobs.map((job, index) => ({
          id: job.id,
          service_name: job.service_name,
          address: job.address,
          order: index + 1
        })),
        originalDistance: originalDistance.toFixed(1),
        optimizedDistance: optimizedDistance.toFixed(1),
        distanceSaved: distanceSaved.toFixed(1),
        timeSaved: `${timeSaved} minutes`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Route optimization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});