import { Client } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_AKGCf5S9eNrx@ep-quiet-cherry-aidpplme-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Ensure we connect over port 443 if standard port 5432 is blocked
let dbUrl = connectionString;
if (dbUrl.includes('@') && !dbUrl.includes(':5432') && !dbUrl.includes(':443')) {
  dbUrl = dbUrl.replace(/(ep-[\w-]+\.c-4\.us-east-1\.aws\.neon\.tech)/, '$1:443');
}

async function main() {
  console.log('Connecting to Neon database via Client...');
  const client = new Client({
    connectionString: dbUrl,
  });
  await client.connect();

  try {
    // 1. Drop existing tables cascade
    console.log('Dropping existing tables to align with Drizzle ORM schema...');
    await client.query(`
      DROP TABLE IF EXISTS 
        users, 
        properties, 
        tenant_contacts, 
        invoices, 
        tickets, 
        agent_activity_log, 
        invitations, 
        property_manager_relations, 
        contractors,
        agent_activities
      CASCADE
    `);

    // 2. Read the Drizzle generated SQL file
    const sqlFilePath = path.join(__dirname, '../drizzle/0000_omniscient_joshua_kane.sql');
    console.log(`Reading Drizzle SQL migration from: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Drizzle splits statements with '--> statement-breakpoint'
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Applying ${statements.length} schema statements...`);
    for (const statement of statements) {
      await client.query(statement);
    }
    console.log('Schema statements applied successfully.');

    // 3. Seed users
    console.log('Seeding default users...');
    await client.query(`
      INSERT INTO users (email, password, name, role)
      VALUES 
        ('landlord@trenor.com', 'password123', 'Sarah Jenkins', 'landlord'),
        ('tenant@trenor.com', 'password123', 'Alice Johnson', 'tenant')
    `);

    // 4. Seed contractors
    console.log('Seeding contractors...');
    await client.query(`
      INSERT INTO contractors (name, email, specialty, phone, status, bio, hourly_rate, onboarded)
      VALUES 
        ('John Smith', 'john@smithplumbing.com', 'Plumbing & Heating', '+1 (555) 123-4567', 'available', 'Expert residential plumbing, boiler service, and emergency drain repairs.', 120, TRUE),
        ('Robert Garcia', 'robert@garciaelectrical.com', 'Electrical & Wiring', '+1 (555) 234-5678', 'available', 'Licensed electrician. Panel upgrades, safety inspections, lighting installation.', 135, TRUE),
        ('Michael Miller', 'michael@millerroofing.com', 'Roofing & Exterior', '+1 (555) 345-6789', 'busy', 'Professional roofing inspections, patch repairs, and rain gutter maintenance.', 110, TRUE)
    `);

    // 5. Seed default demo property, tenant, and invoice
    console.log('Seeding properties, tenant_contacts, and invoices...');
    await client.query(`
      INSERT INTO properties (id, name, address, landlord_id, units_count, status)
      VALUES ('demo-property-id', 'The Lumina Heights', 'Nairobi, Kenya', 'demo-landlord-id', 1, 'Active')
    `);
    await client.query(`
      INSERT INTO tenant_contacts (id, name, email, phone, unit, property_id, property_name, landlord_id, rent, arrears, status)
      VALUES ('demo-tenant-contact-id', 'Alice Johnson', 'tenant@trenor.com', '+1 (555) 901-2345', 'Unit 4B', 'demo-property-id', 'The Lumina Heights', 'demo-landlord-id', 'KES 2,400', 2400, 'Active')
    `);
    await client.query(`
      INSERT INTO invoices (id, tenant_email, tenant_name, unit_number, amount_due, property_name, landlord_id, status)
      VALUES ('INV-DEMO-1', 'tenant@trenor.com', 'Alice Johnson', 'Unit 4B', 2400, 'The Lumina Heights', 'demo-landlord-id', 'Unpaid')
    `);

    console.log('Migration and seeding completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
