import { pgTable, serial, varchar, integer, text, timestamp, boolean, numeric } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const properties = pgTable('properties', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  unitsCount: integer('units_count').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  photoUrl: varchar('photo_url', { length: 512 }),
});

export const tenantContacts = pgTable('tenant_contacts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone: varchar('phone', { length: 255 }),
  unit: varchar('unit', { length: 255 }),
  propertyId: varchar('property_id', { length: 255 }),
  propertyName: varchar('property_name', { length: 255 }),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  rent: varchar('rent', { length: 255 }),
  arrears: numeric('arrears').default('0'),
  status: varchar('status', { length: 50 }).default('Active'),
  userId: integer('user_id'),
});

export const invoices = pgTable('invoices', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantEmail: varchar('tenant_email', { length: 255 }).notNull(),
  tenantName: varchar('tenant_name', { length: 255 }).notNull(),
  unitNumber: varchar('unit_number', { length: 255 }),
  amountDue: numeric('amount_due').notNull(),
  propertyName: varchar('property_name', { length: 255 }),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('Unpaid'),
  stripeSessionId: varchar('stripe_session_id', { length: 255 }),
});

export const tickets = pgTable('tickets', {
  id: varchar('id', { length: 255 }).primaryKey(),
  description: text('description').notNull(),
  urgency: varchar('urgency', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('open'),
  tenantEmail: varchar('tenant_email', { length: 255 }).notNull(),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  propertyName: varchar('property_name', { length: 255 }),
  unitNumber: varchar('unit_number', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  contractorId: integer('contractor_id'),
  amount: numeric('amount'),
  contractorAccepted: boolean('contractor_accepted').default(false),
  photoUrl: varchar('photo_url', { length: 512 }),
  locationName: varchar('location_name', { length: 255 }),
  rating: integer('rating'),
  ratingComment: text('rating_comment'),
});

export const agentActivityLog = pgTable('agent_activity_log', {
  id: serial('id').primaryKey(),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  description: text('description').notNull(),
  toolName: varchar('tool_name', { length: 255 }),
  inputSummary: text('input_summary'),
  outputSummary: text('output_summary'),
  status: varchar('status', { length: 50 }).notNull().default('success'),
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  modelUsed: varchar('model_used', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invitations = pgTable('invitations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  targetRole: varchar('target_role', { length: 255 }).default('manager'),
  propertyId: varchar('property_id', { length: 255 }),
  unit: varchar('unit', { length: 255 }),
  createdById: varchar('created_by_id', { length: 255 }),
});

export const propertyManagerRelations = pgTable('property_manager_relations', {
  id: serial('id').primaryKey(),
  managerId: varchar('manager_id', { length: 255 }).notNull(),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contractors = pgTable('contractors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  specialty: varchar('specialty', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  status: varchar('status', { length: 50 }).default('available'),
  createdAt: timestamp('created_at').defaultNow(),
  bio: text('bio'),
  hourlyRate: numeric('hourly_rate'),
  photoUrl: varchar('photo_url', { length: 512 }),
  latitude: varchar('latitude', { length: 50 }),
  longitude: varchar('longitude', { length: 50 }),
  locationName: varchar('location_name', { length: 255 }),
  onboarded: boolean('onboarded').default(false),
});

export const agentToolConfig = pgTable('agent_tool_config', {
  id: serial('id').primaryKey(),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  toolName: varchar('tool_name', { length: 255 }).notNull(),
  enabled: boolean('enabled').default(true),
  requiresApproval: boolean('requires_approval').default(false),
});

export const agentConversations = pgTable('agent_conversations', {
  id: serial('id').primaryKey(),
  landlordId: varchar('landlord_id', { length: 255 }).notNull(),
  messages: text('messages').default('[]'),
  state: text('state').default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
