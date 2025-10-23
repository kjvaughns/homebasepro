export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } 
    }
  );
}

export function successResponse(data: any) {
  return jsonResponse({ ok: true, success: true, ...data }, 200);
}

export function errorResponse(code: string, message: string, status = 400, extra: any = {}) {
  return jsonResponse({ ok: false, code, message, ...extra }, status);
}

export function handleCorsPrefilight(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return null;
}
