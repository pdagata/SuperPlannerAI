/**
 * DB abstraction layer — supports SQLite (dev), PostgreSQL, and Supabase (production).
 *
 * Priority:
 *   1. DATABASE_URL env var          → direct PostgreSQL / Supabase connection
 *   2. SUPABASE_URL + SUPABASE_DB_PASSWORD → auto-build Supabase connection string
 *   3. No DATABASE_URL              → SQLite (local dev)
 */
import { Pool } from 'pg';
import SQLite from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Auto-construct DATABASE_URL from Supabase env vars ────────────────────────
/*if (!process.env.DATABASE_URL && process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
  const projectRef = process.env.SUPABASE_URL
    .replace(/^https?:\/\//, '')
    .split('.')[0];
  process.env.DATABASE_URL =
    `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}` +
    `@db.${projectRef}.supabase.co:5432/postgres`;
  console.log(`🔗 Supabase: using project "${projectRef}"`);
}*/

// ── Auto-construct DATABASE_URL from Supabase env vars ────────────────────────
// ── Auto-construct DATABASE_URL from Supabase env vars ────────────────────────
if (!process.env.DATABASE_URL && process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
  const projectRef = process.env.SUPABASE_URL
    .replace(/^https?:\/\//, '')
    .split('.')[0];
    
  // Encode the password so characters like @, #, ? don't break the URL
  const encodedPassword = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);

  process.env.DATABASE_URL =
    `postgresql://postgres:${encodedPassword}` +
    `@db.${projectRef}.supabase.co:5432/postgres`;
    
  console.log(`🔗 Supabase: using project "${projectRef}"`);
}

export type DbClient = 'sqlite' | 'pg';
export const isPostgres = !!process.env.DATABASE_URL;

// ── PostgreSQL / Supabase ─────────────────────────────────────────────────────
let pgPool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pgPool) {
    const connStr = process.env.DATABASE_URL!;
    const isSupabase = connStr.includes('supabase.co');
    // Supabase requires SSL; also honour explicit sslmode=require
    const needsSsl = isSupabase || connStr.includes('sslmode=require');
    pgPool = new Pool({
      connectionString: connStr,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
    });
  }
  return pgPool;
}

// ── SQLite ────────────────────────────────────────────────────────────────────
let sqliteDb: SQLite.Database | null = null;

export function getSqliteDb(): SQLite.Database {
  if (!sqliteDb) {
    const dbPath =
      process.env.DATABASE_PATH || path.join(__dirname, '../../agileflow.db');
    sqliteDb = new SQLite(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
  }
  return sqliteDb;
}

// ── SQL dialect translation (SQLite → PostgreSQL) ────────────────────────────
/**
 * Converts SQLite-flavoured SQL to PostgreSQL-compatible SQL:
 *   - ? placeholders  →  $1, $2, …
 *   - INSERT OR IGNORE →  INSERT … ON CONFLICT DO NOTHING
 *   - INSERT OR REPLACE → INSERT … ON CONFLICT DO NOTHING
 */
function toPostgres(sql: string): string {
  let out = sql;

  // INSERT OR IGNORE / INSERT OR REPLACE → ON CONFLICT DO NOTHING
  if (/INSERT\s+OR\s+(IGNORE|REPLACE)/i.test(out)) {
    out = out.replace(/INSERT\s+OR\s+(IGNORE|REPLACE)/i, 'INSERT');
    out = out.trimEnd();
    if (!out.toUpperCase().includes('ON CONFLICT')) {
      out += ' ON CONFLICT DO NOTHING';
    }
  }

  // Convert ? placeholders to $1, $2, …
  let i = 0;
  out = out.replace(/\?/g, () => `$${++i}`);

  return out;
}

// ── Unified adapter ───────────────────────────────────────────────────────────

/** Run a SELECT (or any statement that returns rows). */
export async function query<T = any>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  if (isPostgres) {
    const result = await getPgPool().query(toPostgres(sql), params);
    return result.rows as T[];
  }
  const db = getSqliteDb();
  const stmt = db.prepare(sql);
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
    return stmt.all(...params) as T[];
  }
  stmt.run(...params);
  return [] as T[];
}

/** Run a SELECT that returns at most one row. */
export async function queryOne<T = any>(
  sql: string,
  params: any[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run an INSERT / UPDATE / DELETE. */
export async function execute(sql: string, params: any[] = []): Promise<void> {
  await query(sql, params);
}

/** Run raw SQL (for schema migrations). */
export async function execRaw(sql: string): Promise<void> {
  if (isPostgres) {
    await getPgPool().query(sql);
  } else {
    getSqliteDb().exec(sql);
  }
}
