function configuredOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return configuredOrigins().includes(origin);
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  const allowed = configuredOrigins();
  const selected = origin && allowed.includes(origin) ? origin : '';
  return {
    ...(selected ? { 'Access-Control-Allow-Origin': selected } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'Retry-After, X-Request-Id',
    'Vary': 'Origin',
  };
}
