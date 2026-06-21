import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_AKGCf5S9eNrx@ep-quiet-cherry-aidpplme-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Automatically rewrite connection host to route via port 443 if no explicit port is defined (bypasses firewall blocks on 5432)
let dbUrl = connectionString;
if (dbUrl.includes('@') && !dbUrl.includes(':5432') && !dbUrl.includes(':443')) {
  dbUrl = dbUrl.replace(/(ep-[\w-]+\.c-4\.us-east-1\.aws\.neon\.tech)/, '$1:443');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});
