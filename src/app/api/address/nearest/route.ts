import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 });
  }

  // ⚠️ ST_MakePoint(lon, lat) 순서 주의!
  const rows = await q(`
    SELECT id, lat, lng, full_road_address, gu, dong,
           score, medical_lv2, medical_lv3
    FROM address_scores
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)
    LIMIT 1
  `, [lat, lng]);

  return NextResponse.json(rows[0] ?? null);
}
