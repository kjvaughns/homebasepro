import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const month = toNum(input.month) || (new Date().getMonth() + 1);
    const zip = (input.zip || '').toString();
    const year = toNum(input.year_built);
    const sqft = toNum(input.sqft);
    const acres = toNum(input.lot_acres);

    // Service defaults
    const BASE: Record<string, { base_per_unit?: number; base_flat?: number; min_fee?: number }> = {
      'Lawn Mowing': { base_per_unit: 55, min_fee: 60 },
      'Lawn Care': { base_per_unit: 55, min_fee: 60 },
      'HVAC Tune-Up': { base_per_unit: 85, base_flat: 35, min_fee: 120 },
      'HVAC Service': { base_per_unit: 85, base_flat: 35, min_fee: 120 },
      'Gutter Cleaning': { base_per_unit: 1.3, min_fee: 120 },
      'Window Cleaning': { base_per_unit: 5, min_fee: 100 },
      'Pool Cleaning': { base_flat: 100, min_fee: 100 },
      'Pressure Washing': { base_per_unit: 0.15, min_fee: 150 },
      'Deep Clean': { base_per_unit: 0.20, min_fee: 150 },
      'Pest Control': { base_per_unit: 0.12, min_fee: 120 },
    };

    const d = BASE[svc] || { base_per_unit: 50, min_fee: 100 };

    const basePer = toNum(d.base_per_unit);
    const baseFlat = toNum(d.base_flat);
    const minFee = toNum(d.min_fee);

    // Multipliers as ranges [low, high]
    const mul: Record<string, [number, number]> = {
      seasonal: [1.00, 1.00],
      region: [1.00, 1.00],
      size: [1.00, 1.00],
      age: [1.00, 1.00],
      big_lot: [1.00, 1.00]
    };

    // Seasonal adjustments
    const s = svc.toLowerCase();
    if (s.includes('lawn') && [4, 5, 6, 7, 8, 9].includes(month)) mul.seasonal = [1.05, 1.15];
    if (s.includes('gutter') && [3, 4, 10, 11].includes(month)) mul.seasonal = [1.05, 1.18];
    if (s.includes('hvac') && [5, 6, 7, 8].includes(month)) mul.seasonal = [1.06, 1.15];
    if (s.includes('pool') && [4, 5, 6, 7, 8, 9].includes(month)) mul.seasonal = [1.03, 1.10];

    // Region (Mississippi cheaper)
    if (zip.startsWith('39')) mul.region = [0.95, 0.95];
    else mul.region = [1.00, 1.05];

    // Size factor for sqft services
    if (unit === 'sqft' && sqft) {
      if (sqft <= 1200) mul.size = [0.9, 1.0];
      else if (sqft <= 2000) mul.size = [1.0, 1.05];
      else if (sqft <= 3000) mul.size = [1.08, 1.18];
      else mul.size = [1.15, 1.30];
    }

    // Age factor
    if (year) {
      const age = new Date().getFullYear() - year;
      if (age >= 25 && age < 40) mul.age = [1.03, 1.10];
      else if (age >= 40) mul.age = [1.08, 1.18];
    }

    // Big lot factor for lawn
    if (s.includes('lawn') && unit === 'acre' && acres > 2) {
      mul.big_lot = [1.05, 1.12];
    }

    // Calculate range
    const variable = basePer * units;
    const base = baseFlat + variable;
    
    const lowMult = Object.values(mul).reduce((acc, [lo]) => acc * lo, 1);
    const highMult = Object.values(mul).reduce((acc, [, hi]) => acc * hi, 1);

    let estLow = Math.max(Math.round(base * lowMult), minFee);
    let estHigh = Math.max(Math.round(base * highMult), minFee);
    if (estHigh < estLow) estHigh = estLow;

    // Confidence score
    let confidence = 0.75;
    if (units) confidence += 0.10;
    if (year || sqft || acres) confidence += 0.05;
    confidence = Math.min(0.95, confidence);

    const result = {
      service: svc,
      unit_type: unit,
      units: Number(units.toFixed(2)),
      estimate_low: estLow,
      estimate_high: estHigh,
      factors: {
        seasonal: mul.seasonal[1],
        region: mul.region[1],
        size: mul.size[1],
        age: mul.age[1],
        big_lot: mul.big_lot[1]
      },
      confidence: Number(confidence.toFixed(2))
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in price-service:', error);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
