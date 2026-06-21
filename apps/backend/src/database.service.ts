import { Injectable, OnModuleInit } from '@nestjs/common';
import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './db/schema';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private sqlConnection: any;
  private dbInstance: NeonHttpDatabase<typeof schema>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    this.sqlConnection = neon(connectionString);
    this.dbInstance = drizzle(this.sqlConnection, { schema });
  }

  get sql() {
    return this.sqlConnection;
  }

  get db() {
    return this.dbInstance;
  }

  async onModuleInit() {
    try {
      // Ensure invoices has creator, description, and reconciliation columns
      await this.sqlConnection`
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS reconciled_amount NUMERIC,
        ADD COLUMN IF NOT EXISTS reconciliation_note TEXT,
        ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS reconciled_by VARCHAR(255);
      `;
      // Ensure expenses table exists
      await this.sqlConnection`
        CREATE TABLE IF NOT EXISTS expenses (
          id VARCHAR(255) PRIMARY KEY,
          description TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          category VARCHAR(255) NOT NULL,
          property_id VARCHAR(255) NOT NULL,
          property_name VARCHAR(255) NOT NULL,
          landlord_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      // Ensure audit_logs table exists
      await this.sqlConnection`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          landlord_id VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      // Ensure tickets table has rating columns
      await this.sqlConnection`
        ALTER TABLE tickets 
        ADD COLUMN IF NOT EXISTS rating INTEGER,
        ADD COLUMN IF NOT EXISTS rating_comment TEXT;
      `;
      // Ensure invitations table has new columns and nullable email
      await this.sqlConnection`
        ALTER TABLE invitations 
        ADD COLUMN IF NOT EXISTS target_role VARCHAR(255) DEFAULT 'manager',
        ADD COLUMN IF NOT EXISTS property_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS unit VARCHAR(255),
        ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(255);
      `;
      await this.sqlConnection`
        ALTER TABLE invitations ALTER COLUMN email DROP NOT NULL;
      `;
      console.log('Database initialized successfully with Drizzle ORM and Neon HTTP client.');
    } catch (e) {
      console.error('Error running startup migrations:', e);
    }
  }
}
