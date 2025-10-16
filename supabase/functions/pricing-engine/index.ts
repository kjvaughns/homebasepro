import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PricingInput {
  service_name: string;
  unit_type: 'acre' | 'sqft' | 'linear_foot' | 'pane' | 'system_count' | 'flat';
  units?: number;
  lot_acres?: number;
  sqft?: number;
  beds?: number;
  baths?: number;
  year_built?: number;
  zip?: string;
  month?: number;
  base_per_unit?: number;
  base_flat?: number;
  min_fee?: number;
  travel_fee?: number;
  max_fee?: number;
  session_id?: string;
  property_lookup_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: PricingInput = await req.json();
    
    const toNum = (v: any) => (v === null || v === undefined || v === '' ? 0 : Number(v));
    const svc = (input.service_name || 'Service').trim();
    const unit = input.unit_type || 'flat';

    // Determine units
    let units = toNum(input.units);
    if (!units) {
      if (unit === 'acre') units = toNum(input.lot_acres);
      if (unit === 'sqft') units = toNum(input.sqft);
      if (unit === 'system_count') units = 1;
      if (unit === 'flat') units = 1;
    }

    // Service defaults
    const DEFAULTS: Record<string, Partial<PricingInput>> = {
      'Lawn Mowing': { base_per_unit: 50, min_fee: 60 },
      'Lawn Care': { base_per_unit: 50, min_fee: 60 },
      'HVAC Tune-Up': { base_per_unit: 80, base_flat: 40, min_fee: 120 },
      'HVAC Service': { base_per_unit: 80, base_flat: 40, min_fee: 120 },
      'Gutter Cleaning': { base_per_unit: 1.2, min_fee: 120 },
      'Window Cleaning': { base_per_unit: 5, min_fee: 100 },
      'Pool Cleaning': { base_flat: 100, min_fee: 100 },
      'Pressure Washing': { base_per_unit: 0.15, min_fee: 150 },
    };

    const d = DEFAULTS[svc] || { base_per_unit: 50, min_fee: 100 };

    const base_per_unit = toNum(input.base_per_unit ?? d.base_per_unit ?? 0);
    const base_flat = toNum(input.base_flat ?? d.base_flat ?? 0);
    const min_fee = toNum(input.min_fee ?? d.min_fee ?? 0);
    const travel_fee = toNum(input.travel_fee ?? 0);
    const max_fee = toNum(input.max_fee ?? 0);

    // Calculate multipliers
    const month = toNum(input.month) || (new Date().getMonth() + 1);
    const zip = (input.zip || '').toString();
    const year_built = toNum(input.year_built);
    const lot_acres = toNum(input.lot_acres);
    const sqft = toNum(input.sqft);

    const mult: Record<string, number> = {
      seasonal: 1.0,
      region: 1.0,
      age: 1.0,
      size: 1.0,
      big_lot: 1.0
    };

    // Seasonal multipliers
    const s = svc.toLowerCase();
    if (s.includes('lawn')) {
      if ([4, 5, 6, 7, 8, 9].includes(month)) mult.seasonal = 1.10;
    }
    if (s.includes('gutter')) {
      if ([3, 4, 10, 11].includes(month)) mult.seasonal = 1.15;
    }
    if (s.includes('hvac')) {
      if ([5, 6, 7, 8].includes(month)) mult.seasonal = 1.12;
    }
    if (s.includes('pool')) {
      if ([4, 5, 6, 7, 8, 9].includes(month)) mult.seasonal = 1.08;
    }

    // Region (Mississippi cheaper)
    if (zip.startsWith('39')) mult.region = 0.95;

    // Age factor
    if (year_built) {
      const age = new Date().getFullYear() - year_built;
      if (age >= 25 && age < 40) mult.age = 1.08;
      else if (age >= 40) mult.age = 1.15;
    }

    // Size factor for sqft services
    if (unit === 'sqft' && sqft) {
      if (sqft <= 1200) mult.size = 0.9;
      else if (sqft <= 2000) mult.size = 1.0;
      else if (sqft <= 3000) mult.size = 1.15;
      else mult.size = 1.3;
    }

    // Big lot factor
    if (s.includes('lawn') && unit === 'acre' && lot_acres > 2) {
      mult.big_lot = 1.10;
    }

    // Calculate estimate
    const variable = base_per_unit * units;
    let est = base_flat + variable;
    let multProd = 1.0;
    for (const v of Object.values(mult)) multProd *= v;
    est = est * multProd + travel_fee;
    if (est < min_fee) est = min_fee;
    if (max_fee && est > max_fee) est = max_fee;

    // Confidence score
    let confidence = 0.75;
    if (units) confidence += 0.1;
    if (year_built) confidence += 0.05;
    if (zip) confidence += 0.05;
    confidence = Math.min(0.95, confidence);

    const result = {
      service: svc,
      unit_type: unit,
      units: Number(units.toFixed(2)),
      base_flat: Number(base_flat.toFixed(2)),
      base_per_unit: Number(base_per_unit.toFixed(2)),
      multipliers_applied: mult,
      multiplier_product: Number(multProd.toFixed(3)),
      travel_fee: Number(travel_fee.toFixed(2)),
      min_fee: Number(min_fee.toFixed(2)),
      max_fee: Number(max_fee.toFixed(2)),
      estimate: Math.round(est),
      confidence: Number(confidence.toFixed(2)),
    };

    // Store in database if session_id provided
    if (input.session_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from('price_estimates').insert({
        session_id: input.session_id,
        property_lookup_id: input.property_lookup_id || null,
        service_name: svc,
        unit_type: unit,
        units: result.units,
        base_flat: result.base_flat,
        base_per_unit: result.base_per_unit,
        multipliers: mult,
        estimate: result.estimate,
        confidence: result.confidence
      });
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pricing-engine:', error);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
