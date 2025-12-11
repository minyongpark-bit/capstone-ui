import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const backendBase =
      process.env.AWS_SCORE_URL ?? process.env.BACKEND_SCORE_URL; // 둘 중 하나 쓰기
    if (!backendBase) {
      return NextResponse.json({ error: 'Score API base URL not set' }, { status: 500 });
    }

    // 들어온 쿼리들을 그대로 복사
    const inUrl = new URL(req.url);
    const outUrl = new URL(backendBase);
    inUrl.searchParams.forEach((v, k) => outUrl.searchParams.set(k, v));

    const res = await fetch(outUrl.toString(), { cache: 'no-store' });
    const body = await res.text();

    return new Response(body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json; charset=utf-8',
      },
    });
  } catch (err) {
    console.error('[scores proxy]', err);
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 502 });
  }
}
