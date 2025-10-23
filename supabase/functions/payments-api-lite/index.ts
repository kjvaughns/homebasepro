const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: CORS });
  }
  
  return new Response(
    JSON.stringify({ ok: true, ping: 'payments-api-lite' }), 
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...CORS } 
    }
  );
});
