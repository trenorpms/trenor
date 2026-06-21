import { Client } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_AKGCf5S9eNrx@ep-quiet-cherry-aidpplme-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Ensure over port 443
let dbUrl = connectionString;
if (dbUrl.includes('@') && !dbUrl.includes(':5432') && !dbUrl.includes(':443')) {
  dbUrl = dbUrl.replace(/(ep-[\w-]+\.c-4\.us-east-1\.aws\.neon\.tech)/, '$1:443');
}

async function main() {
  console.log('Connecting to Neon database to perform online schema updates...');
  const client = new Client({
    connectionString: dbUrl,
  });
  await client.connect();

  try {
    console.log('Altering agent_activity_log...');
    await client.query(`
      ALTER TABLE agent_activity_log ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
      ALTER TABLE agent_activity_log ADD COLUMN IF NOT EXISTS model_used VARCHAR(50);
    `);

    console.log('Creating agent_tool_config...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_tool_config (
        id SERIAL PRIMARY KEY,
        landlord_id VARCHAR(255) NOT NULL,
        tool_name VARCHAR(255) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        requires_approval BOOLEAN DEFAULT false,
        UNIQUE(landlord_id, tool_name)
      );
    `);

    console.log('Creating agent_conversations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_conversations (
        id SERIAL PRIMARY KEY,
        landlord_id VARCHAR(255) NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]',
        state JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Schema updates completed successfully!');
  } catch (error) {
    console.error('Schema updates failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
