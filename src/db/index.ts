/**
 * DB abstraction layer — supports both SQLite (dev) and PostgreSQL (production/SaaS)
 * Set DATABASE_URL env var to switch to PostgreSQL automatically.
 */
import { Pool } from 'pg';
import SQLite from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type DbClient = 'sqlite' | 'pg';

// ── PostgreSQL ────────────────────────────────────────────────────────────────
let pgPool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false });
  }
  return pgPool;
}

// ── SQLite ────────────────────────────────────────────────────────────────────
let sqliteDb: SQLite.Database | null = null;

export function getSqliteDb(): SQLite.Database {
  if (!sqliteDb) {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../agileflow.db');
    sqliteDb = new SQLite(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
  }
  return sqliteDb;
}

// ── Unified adapter ───────────────────────────────────────────────────────────
export const isPostgres = !!process.env.DATABASE_URL;

/**
 * Universal query function.
 * SQLite uses ? placeholders, PostgreSQL uses $1, $2…
 * This helper normalises them automatically.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isPostgres) {
    // Convert ? to $1, $2…
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    const pool = getPgPool();
    const result = await pool.query(pgSql, params);
    return result.rows as T[];
  } else {
    const db = getSqliteDb();
    const stmt = db.prepare(sql);
    // Use .all() or .run() depending on the query type
    const upperSql = sql.trim().toUpperCase();
    if (upperSql.startsWith('SELECT') || upperSql.startsWith('WITH')) {
      return stmt.all(...params) as T[];
    } else {
      stmt.run(...params);
      return [] as T[];
    }
  }
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  await query(sql, params);
}

/** Run raw SQL (for migrations/schema creation) */
export async function execRaw(sql: string): Promise<void> {
  if (isPostgres) {
    await getPgPool().query(sql);
  } else {
    getSqliteDb().exec(sql);
  }
}
