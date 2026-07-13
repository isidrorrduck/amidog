// @ts-nocheck -- This file runs in the Supabase Edge Deno runtime, not the Expo TypeScript runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Origin': '*',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Missing authorization' }, 401);

  const { reservationId } = await request.json().catch(() => ({}));
  if (!isUuid(reservationId)) return json({ error: 'A valid reservationId is required' }, 400);

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const userClient = createClient(supabaseUrl, requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const { data: claimed, error: claimError } = await userClient
    .rpc('claim_experience_preparation_request', { p_reservation_id: reservationId })
    .maybeSingle();

  if (claimError) return json({ error: claimError.message }, 403);

  if (!claimed) {
    const { data: existing } = await userClient
      .from('experience_preparation_requests')
      .select('status')
      .eq('reservation_id', reservationId)
      .maybeSingle();

    return json({ sent: existing?.status === 'sent', status: existing?.status ?? 'unavailable' }, 200);
  }

  const publicOrigin = (Deno.env.get('PUBLIC_PUPPY_ORIGIN') ?? 'https://www.sgservice.es').replace(/\/+$/, '');
  const publicUrl = `${publicOrigin}/public/puppies/${claimed.public_id}`;
  const subject = `Preparar experiencia AmiDog · ${claimed.puppy_name}`;
  const text = buildText(claimed, publicUrl);

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireEnv('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `amidog-experience-${reservationId}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('EXPERIENCE_REQUEST_FROM_EMAIL') ?? 'AmiDog <amidog@sgservice.es>',
        to: [claimed.recipient],
        subject,
        text,
        html: `<pre style="font:14px/1.5 sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
      }),
    });

    if (!resendResponse.ok) throw new Error(`Resend ${resendResponse.status}: ${await resendResponse.text()}`);

    const { error: updateError } = await adminClient
      .from('experience_preparation_requests')
      .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
      .eq('id', claimed.request_id);

    if (updateError) throw updateError;
    return json({ sent: true, status: 'sent' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email delivery error';
    await adminClient
      .from('experience_preparation_requests')
      .update({ status: 'failed', last_error: message.slice(0, 2000) })
      .eq('id', claimed.request_id);

    return json({ sent: false, status: 'failed', error: message }, 502);
  }
});

function buildText(data: Record<string, string | null>, publicUrl: string) {
  return [
    'Nueva solicitud de preparación de experiencia AmiDog',
    '',
    `Criador: ${data.kennel_name}`,
    `Cachorro: ${data.puppy_name}`,
    `Propietario: ${data.owner_name}`,
    `Teléfono: ${data.owner_phone ?? 'No indicado'}`,
    `Email: ${data.owner_email ?? 'No indicado'}`,
    `Camada: ${data.litter_name}`,
    `URL pública: ${publicUrl}`,
    `Identificador interno del cachorro: ${data.puppy_id}`,
  ].join('\n');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] ?? character);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

