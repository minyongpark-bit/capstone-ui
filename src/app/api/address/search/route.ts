import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();
  const limit = Number(searchParams.get('limit') ?? 1);
  if (!query) return NextResponse.json({ items: [] });

  const rows = await q(`
    SELECT id, lat, lng, full_road_address, gu, dong, 
           score, medical_lv2, medical_lv3
    FROM address_scores
    WHERE full_road_address ILIKE '%' || $1 || '%'
    ORDER BY score DESC
    LIMIT $2
  `, [query, limit]);

  return NextResponse.json({ items: rows });
}
