import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Parse PEM format private key and return raw PKCS#8 bytes
function parsePemPrivateKey(pemKey: string): Uint8Array {
  // Remove PEM headers/footers and whitespace
  const base64 = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  // Decode standard Base64 (not URL-safe)
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

// Convert raw 32-byte EC private key to PKCS#8 format
function rawPrivateKeyToPKCS8(rawKey: Uint8Array): Uint8Array {
  // PKCS#8 structure for EC P-256 private key
  // This is the ASN.1 DER encoding wrapper around a raw 32-byte EC private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, // SEQUENCE, length 135
    0x02, 0x01, 0x00, // INTEGER version 0
    0x30, 0x13, // SEQUENCE (algorithm)
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID prime256v1
    0x04, 0x6d, // OCTET STRING, length 109
    0x30, 0x6b, // SEQUENCE
    0x02, 0x01, 0x01, // INTEGER version 1
    0x04, 0x20 // OCTET STRING, length 32 (the actual private key follows)
  ]);
  
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00 // Public key context tag (we don't have it, so minimal)
  ]);
  
  // Combine: header + raw key + footer
  const pkcs8 = new Uint8Array(pkcs8Header.length + rawKey.length + pkcs8Footer.length);
  pkcs8.set(pkcs8Header, 0);
  pkcs8.set(rawKey, pkcs8Header.length);
  pkcs8.set(pkcs8Footer, pkcs8Header.length + rawKey.length);
  
  return pkcs8;
}

// Convert DER-encoded ECDSA signature to raw format (r || s)
function derToRaw(der: Uint8Array): Uint8Array {
  // DER structure: SEQUENCE { INTEGER r, INTEGER s }
  let offset = 0;

  // Expect SEQUENCE (0x30)
  if (der[offset++] !== 0x30) throw new Error('Invalid DER: expected SEQUENCE');

  // Read DER length (supports short and long forms)
  const readLen = (buf: Uint8Array, off: number) => {
    let lenByte = buf[off++];
    if (lenByte < 0x80) return { len: lenByte, off };
    const numBytes = lenByte & 0x7f;
    if (numBytes === 0 || numBytes > 4) throw new Error('Invalid DER: length too long');
    let len = 0;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | buf[off++];
    }
    return { len, off };
  };

  const seq = readLen(der, offset);
  const seqLen = seq.len; // Not strictly used but validated implicitly by parsing
  offset = seq.off;

  // Expect INTEGER (r)
  if (der[offset++] !== 0x02) throw new Error('Invalid DER: expected INTEGER (r)');
  const rInfo = readLen(der, offset); let rLen = rInfo.len; offset = rInfo.off;
  let r = der.slice(offset, offset + rLen); offset += rLen;

  // Expect INTEGER (s)
  if (der[offset++] !== 0x02) throw new Error('Invalid DER: expected INTEGER (s)');
  const sInfo = readLen(der, offset); let sLen = sInfo.len; offset = sInfo.off;
  let s = der.slice(offset, offset + sLen);

  // Helper to trim leading zeros (positive INTEGER encoding)
  const trim = (arr: Uint8Array) => {
    let i = 0;
    while (i < arr.length - 1 && arr[i] === 0) i++;
    return arr.slice(i);
  };

  r = trim(r);
  s = trim(s);

  // Ensure at most 32 bytes (P-256 component size). If longer, take the rightmost 32 bytes.
  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);

  // Left-pad to 32 bytes
  const rPadded = new Uint8Array(32); rPadded.set(r, 32 - r.length);
  const sPadded = new Uint8Array(32); sPadded.set(s, 32 - s.length);

  const raw = new Uint8Array(64);
  raw.set(rPadded, 0);
  raw.set(sPadded, 32);
  return raw;
}

// Create properly signed VAPID JWT
async function createVapidAuthHeader(
  audience: string,
  subject: string,
  publicKey: string,
  privateKeyBase64: string
): Promise<string> {
  // JWT header
  const header = { typ: 'JWT', alg: 'ES256' };
  const headerBase64 = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );

  // JWT payload
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject
  };
  const payloadBase64 = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  // Import private key for signing
  let privateKeyBytes: Uint8Array;
  
  // Check if it's a PEM format key
  if (privateKeyBase64.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log('🔑 Detected PEM format VAPID private key');
    privateKeyBytes = parsePemPrivateKey(privateKeyBase64);
  } else {
    // Try decoding as standard Base64 first (raw 32-byte EC key)
    try {
      const rawData = atob(privateKeyBase64);
      privateKeyBytes = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        privateKeyBytes[i] = rawData.charCodeAt(i);
      }
      console.log('🔑 Decoded as standard Base64, length:', privateKeyBytes.length);
    } catch (e) {
      // Fall back to Base64 URL-safe
      console.log('🔑 Using Base64 URL-safe decoding');
      privateKeyBytes = base64UrlToUint8Array(privateKeyBase64);
    }
  }
  
  let privateKey: CryptoKey;
  
  // Try importing as PKCS#8 first
  try {
    privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes.buffer as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    console.log('🔑 Using PKCS#8 VAPID private key');
  } catch (pkcs8Error) {
    // If PKCS#8 import fails and we have exactly 32 bytes, it's a raw key
    if (privateKeyBytes.length === 32) {
      console.log('🔑 Detected raw VAPID private key, converting to PKCS#8...');
      const pkcs8Key = rawPrivateKeyToPKCS8(privateKeyBytes);
      privateKey = await crypto.subtle.importKey(
        'pkcs8',
        pkcs8Key.buffer as ArrayBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      console.log('✅ Raw key successfully converted and imported');
    } else {
      console.error('❌ Invalid private key format. Expected 32-byte raw key or valid PKCS#8');
      const errorMsg = pkcs8Error instanceof Error ? pkcs8Error.message : 'Unknown error';
      throw new Error(`Invalid private key: ${errorMsg}`);
    }
  }

  // Sign the token
  const unsignedToken = `${headerBase64}.${payloadBase64}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Handle signature format (crypto.subtle.sign may return raw or DER depending on environment)
  const signatureBytes = new Uint8Array(signature);
  console.log('🔏 Signature length:', signatureBytes.length);

  let rawSignature: Uint8Array;
  if (signatureBytes.length === 64) {
    // Already in raw format (r || s)
    console.log('✅ Signature already in raw format');
    rawSignature = signatureBytes;
  } else {
    // Attempt DER -> raw conversion for any other length
    console.log('🔄 Attempting to convert DER signature to raw format');
    rawSignature = derToRaw(signatureBytes);
  }

  console.log('✅ Raw signature length:', rawSignature.length, '(should be 64)');
  const signatureBase64 = uint8ArrayToBase64Url(rawSignature);
  
  return `vapid t=${unsignedToken}.${signatureBase64}, k=${publicKey}`;
}

interface PushResult {
  success: boolean;
  expired: boolean;
  status: number;
  reason?: string;
}

async function sendPushNotification(
  subscription: any,
  payload: any,
  vapidDetails: any
): Promise<PushResult> {
  try {
    const parsedUrl = new URL(subscription.endpoint);
    const audience = `${parsedUrl.protocol}//${parsedUrl.host}`;

    // Create proper VAPID authorization header
    const authHeader = await createVapidAuthHeader(
      audience,
      vapidDetails.subject,
      vapidDetails.publicKey,
      vapidDetails.privateKey
    );

    // For simplicity, we'll send a minimal notification trigger
    // The service worker will handle displaying the notification
    const headers = {
      'Authorization': authHeader,
      'TTL': '86400',
      'Content-Length': '0'
    };

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers
    });

    // Only mark as expired for permanent failures (404 Not Found or 410 Gone)
    if (response.status === 410 || response.status === 404) {
      console.log('🗑️ Subscription expired or not found (will be deleted)');
      return { success: false, expired: true, status: response.status };
    }

    if (response.status === 201 || response.status === 200) {
      console.log('✅ Push notification sent successfully');
      return { success: true, expired: false, status: response.status };
    }

    // Other errors (401, 403, 5xx) are temporary - don't delete subscription
    const text = await response.text().catch(() => '');
    console.error(`❌ Push failed (non-fatal): ${response.status} ${text}`);
    return { success: false, expired: false, status: response.status, reason: text };
  } catch (error) {
    console.error('❌ Push send error (non-fatal):', error);
    const reason = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, expired: false, status: 0, reason };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests (browser prefetch, health checks, etc.)
  if (req.method === 'GET') {
    console.info('ℹ️ GET request received (likely browser prefetch or health check)');
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        message: 'Push notification service is running. Use POST with Authorization header to send notifications.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Handle unsupported methods
  if (req.method !== 'POST') {
    console.warn(`⚠️ Unsupported method: ${req.method}`);
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed',
        message: 'Only POST requests are supported for sending push notifications.' 
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' } }
    );
  }

  // From here on, it's a POST request - require Authorization
  console.log('🔐 Received POST push notification request');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('❌ Missing authorization header on POST request');
    return new Response(
      JSON.stringify({ 
        error: 'Missing authorization header',
        message: 'Please ensure you are authenticated. Include your session token in the Authorization header.'
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('✅ Authorization header present:', authHeader.substring(0, 20) + '...');

  try {
    // Accept both user auth and service role auth
    let isServiceRole = false;
    let supabaseClient;
    let currentUserId: string | null = null;

    // Normalize header: remove "Bearer " prefix if present, trim whitespace
    const normalizedHeader = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Check if it's a service role call
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (serviceRoleKey && normalizedHeader === serviceRoleKey) {
      isServiceRole = true;
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        serviceRoleKey
      );
      console.log('🔑 Using service role authentication');
    } else {
      // Regular user authentication
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      console.log('👤 Verifying user authentication...');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        console.error('❌ Auth verification failed:', userError?.message || 'No user');
        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized',
            message: 'Invalid or expired authentication token'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      currentUserId = user.id;
      console.log('✅ User authenticated:', currentUserId);
    }

    const { userIds, title, body, url, icon } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📤 Push notification request:', { title, userIds: userIds?.length || 'current user' });

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@homebaseapp.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    let query = supabaseClient.from('push_subscriptions').select('*');
    
    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else if (!isServiceRole && currentUserId) {
      query = query.eq('user_id', currentUserId);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No subscriptions found for user:', currentUserId || '(service role - no user filter)');
      console.log('📋 Query filters:', { userIds: userIds?.length || 0, isServiceRole, currentUserId });
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Sending to ${subscriptions.length} subscription(s)`);

    // Store notification in database so service worker can fetch it
    const notificationUserId = userIds && userIds.length > 0 ? userIds[0] : currentUserId;
    const { data: notification } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: notificationUserId,
        title,
        message: body,
        link: url || '/',
        type: 'announcement'
      })
      .select()
      .single();

    const vapidDetails = {
      subject: vapidSubject,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey
    };

    let sent = 0;
    let failed = 0;
    let expired = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const result = await sendPushNotification(subscription, notification, vapidDetails);
      
      if (result.success) {
        sent++;
      } else {
        failed++;
        if (result.expired) {
          expired++;
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    console.log(`✅ Results: ${sent} sent, ❌ ${failed} failed (${expired} expired)`);

    // Only delete subscriptions that are truly expired (404/410), not temporary failures
    if (expiredEndpoints.length > 0) {
      await supabaseClient
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
      
      console.log(`🗑️ Removed ${expiredEndpoints.length} expired subscription(s)`);
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
