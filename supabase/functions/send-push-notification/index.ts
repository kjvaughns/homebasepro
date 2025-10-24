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
  const privateKeyBytes = base64UrlToUint8Array(privateKeyBase64);
  
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

  const signatureBase64 = uint8ArrayToBase64Url(new Uint8Array(signature));
  
  return `vapid t=${unsignedToken}.${signatureBase64}, k=${publicKey}`;
}

async function sendPushNotification(
  subscription: any,
  payload: any,
  vapidDetails: any
): Promise<boolean> {
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

    if (response.status === 410 || response.status === 404) {
      console.log('🗑️ Subscription expired or not found');
      return false;
    }

    if (response.status === 201 || response.status === 200) {
      console.log('✅ Push notification sent successfully');
      return true;
    }

    console.error('❌ Push failed:', response.status, await response.text());
    return false;
  } catch (error) {
    console.error('❌ Push send error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔐 Received push notification request');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('❌ Missing authorization header');
    console.error('Available headers:', Object.fromEntries(req.headers.entries()));
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
      console.log('ℹ️ No subscriptions found');
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
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const success = await sendPushNotification(subscription, notification, vapidDetails);
      
      if (success) {
        sent++;
      } else {
        failed++;
        expiredEndpoints.push(sub.endpoint);
      }
    }

    console.log(`✅ Results: ${sent} sent, ❌ ${failed} failed`);

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
