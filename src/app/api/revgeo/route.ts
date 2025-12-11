import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'bad lat/lng' }, { status: 400 });
    }

    // PostGIS는 (lon, lat) 순서
    const sql = `
      SELECT id, lat, lng, full_road_address, dong, gu,
             score, medical_lv2, medical_lv3,
             ST_DistanceSphere(geom, ST_SetSRID(ST_Point($2,$1),4326)) AS meters
        FROM public.address_scores
       WHERE geom IS NOT NULL
       ORDER BY geom <-> ST_SetSRID(ST_Point($2,$1),4326)
       LIMIT 1;
    `;
    const { rows } = await pool.query(sql, [lat, lng]);
    const r = rows[0];
    if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return NextResponse.json({
      id: r.id,
      lat: r.lat, lng: r.lng,
      address: r.full_road_address,
      dong: r.dong, gu: r.gu,
      meters: r.meters,                 // 매칭 거리(미터)
      // 필요하면 우측 카드 점수로도 바로 쓰게 같이 전달
      metrics: {
        food: r.score,
        medical_lv2: r.medical_lv2,
        medical_lv3: r.medical_lv3,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
