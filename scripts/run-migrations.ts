/**
 * Runs every .sql file in supabase/migrations/ (in filename order) against
 * the Supabase Postgres database, using the connection string in
 * SUPABASE_DB_URL.
 *
 * This is a plain script, not a framework — it is intentionally simple so it
 * keeps working unchanged if you move off Supabase's pooled connection to a
 * self-hosted Postgres instance on your own VPS later.
 *
 * Usage:
 *   npm run db:migrate
 *
 * Requires: SUPABASE_DB_URL in .env.local (Supabase Dashboard → Project
 * Settings → Database → Connection string → URI, "Direct connection" or
 * "Session pooler").
 *
 * Alternative: paste the contents of supabase/migrations/0001_init.sql
 * directly into the Supabase SQL Editor — this script is a convenience, not
 * a requirement.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import 'dotenv/config';

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      '\n✗ SUPABASE_DB_URL is not set. Add it to .env.local (see .env.example).\n'
    );
    process.exit(1);
  }

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found in supabase/migrations/.');
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    for (const file of files) {
      const fullPath = join(migrationsDir, file);
      const sql = readFileSync(fullPath, 'utf8');
      console.log(`→ Running ${file} ...`);
      await client.query(sql);
      console.log(`  ✓ ${file} applied`);
    }
    console.log('\n✓ All migrations applied successfully.\n');
  } catch (err) {
    console.error('\n✗ Migration failed:\n', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
