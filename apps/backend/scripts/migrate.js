const { neon } = require('@neondatabase/serverless');

const connectionString = 'postgresql://neondb_owner:npg_AKGCf5S9eNrx@ep-quiet-cherry-aidpplme-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(connectionString);

async function runMigrations() {
  console.log('Connecting to Neon database...');
  try {
    // 1. Create Users Table
    console.log('Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('landlord', 'tenant', 'moderator', 'contractor')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Create Properties Table
    console.log('Creating properties table...');
    await sql`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        address VARCHAR(255) NOT NULL,
        landlord_id INT REFERENCES users(id) ON DELETE CASCADE,
        units_count INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Create Tickets Table
    console.log('Creating tickets table...');
    await sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        urgency VARCHAR(50) NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed', 'on_hold')),
        property_id INT REFERENCES properties(id) ON DELETE SET NULL,
        tenant_id INT REFERENCES users(id) ON DELETE SET NULL,
        contractor_id INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Create Agent Activities Table
    console.log('Creating agent_activities table...');
    await sql`
      CREATE TABLE IF NOT EXISTS agent_activities (
        id SERIAL PRIMARY KEY,
        ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL CHECK (status IN ('thinking', 'acting', 'waiting', 'done', 'failed')),
        action_description TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 5. Seed initial demo users
    console.log('Seeding initial demo users...');
    // Seed Landlord
    await sql`
      INSERT INTO users (email, password, name, role)
      VALUES ('landlord@trenor.com', 'password123', 'Sarah Jenkins', 'landlord')
      ON CONFLICT (email) DO NOTHING;
    `;

    // Seed Tenant
    await sql`
      INSERT INTO users (email, password, name, role)
      VALUES ('tenant@trenor.com', 'password123', 'Alice Johnson', 'tenant')
      ON CONFLICT (email) DO NOTHING;
    `;

    console.log('Migrations and seeding finished successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
