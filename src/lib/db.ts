import { Pool, QueryResultRow } from 'pg';

const config = {
  // 있으면 한 줄로 연결(PlanetScale 등과 동일한 패턴)
  connectionString: process.env.DATABASE_URL || undefined,

  // 없으면 개별 항목 사용
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,

  // RDS는 SSL 필요. 검증을 끄려면 PGSSL=require 로 제어 가능
  ssl:
    process.env.PGSSL === 'require' || process.env.PGSSLMODE
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: false }, // RDS 기본 유지

  // 풀 옵션(필수는 아님)
  max: Number(process.env.PGPOOL_MAX ?? 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
} as const;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

// 🔸 싱글톤 풀 (핫리로드/서버리스 재실행 안전)
export const pool = global.__pgPool ?? (global.__pgPool = new Pool(config));

export async function q<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const c = await pool.connect();
  try {
    const r = await c.query<T>(sql, params);
    return r.rows;
  } finally {
    c.release();
  }
}
