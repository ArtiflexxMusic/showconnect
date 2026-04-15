import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const url = process.env.SUPABASE_DB_URL
if (!url) { console.error('SUPABASE_DB_URL not set'); process.exit(1) }

const sqlPath = process.argv[2]
if (!sqlPath) { console.error('usage: node run_migration.mjs <sql-file>'); process.exit(1) }

const sql = fs.readFileSync(sqlPath, 'utf8')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log('connected ✓')
  console.log(`executing: ${path.basename(sqlPath)} (${sql.length} bytes)`)
  await client.query(sql)
  console.log('migration executed ✓')

  // verify: list columns on rundown_templates
  const { rows } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rundown_templates'
    ORDER BY ordinal_position
  `)
  console.log('\nrundown_templates columns:')
  for (const r of rows) console.log(`  - ${r.column_name} (${r.data_type}, nullable=${r.is_nullable})`)

  await client.end()
} catch (err) {
  console.error('ERROR:', err.message)
  await client.end().catch(() => {})
  process.exit(2)
}
