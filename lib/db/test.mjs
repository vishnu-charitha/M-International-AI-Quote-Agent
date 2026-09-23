import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const result = await sql`SELECT id, rfq_id, recipient, subject, status, created_at FROM email_outbox ORDER BY created_at DESC LIMIT 5`;
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
