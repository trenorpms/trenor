CREATE TABLE "agent_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"landlord_id" varchar(255) NOT NULL,
	"action" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"tool_name" varchar(255),
	"input_summary" text,
	"output_summary" text,
	"status" varchar(50) DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"specialty" varchar(255) NOT NULL,
	"phone" varchar(50),
	"status" varchar(50) DEFAULT 'available',
	"created_at" timestamp DEFAULT now(),
	"bio" text,
	"hourly_rate" numeric,
	"photo_url" varchar(512),
	"latitude" varchar(50),
	"longitude" varchar(50),
	"location_name" varchar(255),
	"onboarded" boolean DEFAULT false,
	CONSTRAINT "contractors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"landlord_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenant_email" varchar(255) NOT NULL,
	"tenant_name" varchar(255) NOT NULL,
	"unit_number" varchar(255),
	"amount_due" numeric NOT NULL,
	"property_name" varchar(255),
	"landlord_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'Unpaid' NOT NULL,
	"stripe_session_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255) NOT NULL,
	"landlord_id" varchar(255) NOT NULL,
	"units_count" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"photo_url" varchar(512)
);
--> statement-breakpoint
CREATE TABLE "property_manager_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" varchar(255) NOT NULL,
	"landlord_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_contacts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(255),
	"unit" varchar(255),
	"property_id" varchar(255),
	"property_name" varchar(255),
	"landlord_id" varchar(255) NOT NULL,
	"rent" varchar(255),
	"arrears" numeric DEFAULT '0',
	"status" varchar(50) DEFAULT 'Active',
	"user_id" integer,
	CONSTRAINT "tenant_contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"urgency" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"tenant_email" varchar(255) NOT NULL,
	"landlord_id" varchar(255) NOT NULL,
	"property_name" varchar(255),
	"unit_number" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"contractor_id" integer,
	"amount" numeric,
	"contractor_accepted" boolean DEFAULT false,
	"photo_url" varchar(512),
	"location_name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
