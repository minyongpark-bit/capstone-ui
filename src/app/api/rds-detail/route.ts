export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const lat = u.searchParams.get('lat');
  const lng = u.searchParams.get('lng');
  const radius = u.searchParams.get('radius') ?? '1000';

  const base = process.env.RDS_DETAIL_URL; // ex) http://3.38.130.200/get_scores.php
  if (!base || !lat || !lng) {
    return new Response(JSON.stringify({ error: 'bad request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const upstream = new URL(base);
  // PHP가 모드가 필요하면 아래 유지 (아니면 지워도 됨)
  upstream.searchParams.set('mode', 'detail');
  upstream.searchParams.set('lat', lat);
  upstream.searchParams.set('lng', lng);
  upstream.searchParams.set('radius', radius);

  const res = await fetch(upstream.toString(), { cache: 'no-store' });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}
