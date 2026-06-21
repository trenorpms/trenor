// ─── Sophia Tool Registry ───
// Defines all tools available to the AI agent orchestrator.
// Each tool has a Gemini function-calling compatible schema.

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  category: 'properties' | 'tenants' | 'finance' | 'maintenance' | 'analytics' | 'system';
  requiresConfirmation: boolean;
  enabled: boolean;
}

// Convert our registry format into Gemini function declarations
export function toGeminiFunctionDeclarations(tools: ToolDefinition[]) {
  return tools
    .filter(t => t.enabled)
    .map(t => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object' as const,
        properties: Object.fromEntries(
          t.parameters.map(p => [
            p.name,
            {
              type: p.type,
              description: p.description,
              ...(p.enum ? { enum: p.enum } : {}),
            },
          ]),
        ),
        required: t.parameters.filter(p => p.required).map(p => p.name),
      },
    }));
}

// ─── The Full Tool Registry ───
export const TOOL_REGISTRY: ToolDefinition[] = [
  // ── Properties ──
  {
    name: 'list_properties',
    description: 'List all properties managed by the landlord with occupancy, rent totals, and arrears.',
    parameters: [],
    category: 'properties',
    requiresConfirmation: false,
    enabled: true,
  },
  {
    name: 'get_property_detail',
    description: 'Get full details of a specific property including all units and tenants.',
    parameters: [
      { name: 'propertyId', type: 'string', description: 'The property ID to look up', required: true },
    ],
    category: 'properties',
    requiresConfirmation: false,
    enabled: true,
  },
  {
    name: 'create_property',
    description: 'Create a new property with name, address, and unit count. Use this when a landlord wants to add a new building.',
    parameters: [
      { name: 'name', type: 'string', description: 'Property name', required: true },
      { name: 'address', type: 'string', description: 'Property address', required: true },
      { name: 'unitsCount', type: 'number', description: 'Total number of units', required: true },
    ],
    category: 'properties',
    requiresConfirmation: true,
    enabled: true,
  },

  // ── Tenants ──
  {
    name: 'list_tenants',
    description: 'List all tenants across all properties with their rent, arrears, unit, and status.',
    parameters: [],
    category: 'tenants',
    requiresConfirmation: false,
    enabled: true,
  },
  {
    name: 'invite_tenant',
    description: 'Generate an invite code for a new tenant to link to a specific property and unit. Also creates move-in invoices.',
    parameters: [
      { name: 'propertyId', type: 'string', description: 'Property ID to assign the tenant to', required: true },
      { name: 'unit', type: 'string', description: 'Unit number or identifier', required: true },
      { name: 'tenantName', type: 'string', description: 'Full name of the tenant', required: true },
      { name: 'tenantEmail', type: 'string', description: 'Email address of the tenant', required: true },
      { name: 'rentAmount', type: 'number', description: 'Monthly rent amount', required: true },
    ],
    category: 'tenants',
    requiresConfirmation: true,
    enabled: true,
  },
  {
    name: 'find_vacant_units',
    description: 'Find all vacant/unoccupied units in a specific property.',
    parameters: [
      { name: 'propertyId', type: 'string', description: 'Property ID to check', required: true },
    ],
    category: 'tenants',
    requiresConfirmation: false,
    enabled: true,
  },

  // ── Finance ──
  {
    name: 'list_invoices',
    description: 'List all invoices with tenant name, amount, status (Unpaid/Paid/Sent), and property.',
    parameters: [
      { name: 'status', type: 'string', description: 'Filter by status', enum: ['Unpaid', 'Paid', 'Sent', 'all'] },
    ],
    category: 'finance',
    requiresConfirmation: false,
    enabled: true,
  },
  {
    name: 'create_invoice',
    description: 'Create a new invoice for a specific tenant.',
    parameters: [
      { name: 'tenantEmail', type: 'string', description: 'Tenant email address', required: true },
      { name: 'tenantName', type: 'string', description: 'Tenant full name', required: true },
      { name: 'unitNumber', type: 'string', description: 'Unit number', required: true },
      { name: 'amountDue', type: 'number', description: 'Amount due in local currency', required: true },
      { name: 'propertyName', type: 'string', description: 'Property name', required: true },
      { name: 'description', type: 'string', description: 'Invoice description (e.g. "Monthly Rent - July")', required: true },
    ],
    category: 'finance',
    requiresConfirmation: true,
    enabled: true,
  },
  {
    name: 'reconcile_invoice',
    description: 'Mark an invoice as paid / reconcile a payment.',
    parameters: [
      { name: 'invoiceId', type: 'string', description: 'Invoice ID', required: true },
      { name: 'amountPaid', type: 'number', description: 'Amount that was paid', required: true },
      { name: 'description', type: 'string', description: 'Payment note', required: true },
    ],
    category: 'finance',
    requiresConfirmation: true,
    enabled: true,
  },

  // ── Maintenance ──
  {
    name: 'list_tickets',
    description: 'List all maintenance tickets/requests with urgency, status, assigned contractor, and tenant info.',
    parameters: [
      { name: 'status', type: 'string', description: 'Filter by status', enum: ['open', 'assigned', 'completed', 'all'] },
    ],
    category: 'maintenance',
    requiresConfirmation: false,
    enabled: true,
  },
  {
    name: 'list_contractors',
    description: 'List all contractors with their specialty, hourly rate, availability status, and contact info.',
    parameters: [],
    category: 'maintenance',
    requiresConfirmation: false,
    enabled: true,
  },
  {
    name: 'assign_contractor',
    description: 'Assign a specific contractor to a maintenance ticket with a proposed rate.',
    parameters: [
      { name: 'ticketId', type: 'string', description: 'Maintenance ticket ID', required: true },
      { name: 'contractorId', type: 'number', description: 'Contractor ID', required: true },
      { name: 'amount', type: 'number', description: 'Proposed payment amount', required: true },
    ],
    category: 'maintenance',
    requiresConfirmation: true,
    enabled: true,
  },
  {
    name: 'smart_assign_contractor',
    description: 'Automatically find the best-fit and cheapest available contractor for a ticket based on the issue description and contractor specialties. Use this when the user wants automatic matching.',
    parameters: [
      { name: 'ticketId', type: 'string', description: 'Maintenance ticket ID', required: true },
    ],
    category: 'maintenance',
    requiresConfirmation: true,
    enabled: true,
  },

  // ── Analytics ──
  {
    name: 'get_analytics',
    description: 'Get portfolio analytics: total MRR, occupancy rate, total arrears, collection rate, property count, tenant count.',
    parameters: [],
    category: 'analytics',
    requiresConfirmation: false,
    enabled: true,
  },
  {
    name: 'get_audit_log',
    description: 'Get recent activity and audit trail — all actions performed by agents and users.',
    parameters: [
      { name: 'hours', type: 'number', description: 'How many hours back to look (default 24)' },
    ],
    category: 'analytics',
    requiresConfirmation: false,
    enabled: true,
  },

  // ── System ──
  {
    name: 'get_agent_activity',
    description: 'Get the agent activity log showing all tool calls, their status, duration, and results.',
    parameters: [
      { name: 'limit', type: 'number', description: 'Max number of entries (default 50)' },
    ],
    category: 'system',
    requiresConfirmation: false,
    enabled: true,
  },
  {
    name: 'send_tenant_message',
    description: 'Send a direct message or email notification to a tenant regarding rent, maintenance, or general updates.',
    parameters: [
      { name: 'tenantEmail', type: 'string', description: 'Tenant email address to send the message to', required: true },
      { name: 'subject', type: 'string', description: 'Subject of the message', required: true },
      { name: 'message', type: 'string', description: 'The text or description content of the message to send', required: true },
    ],
    category: 'tenants',
    requiresConfirmation: true,
    enabled: true,
  },
  {
    name: 'remove_tenant',
    description: 'Remove a tenant record completely from a property unit (vacating them).',
    parameters: [
      { name: 'tenantId', type: 'string', description: 'The ID of the tenant contact to remove', required: true },
    ],
    category: 'tenants',
    requiresConfirmation: true,
    enabled: true,
  },
  {
    name: 'delete_property',
    description: 'Delete a property entirely from the landlord portfolio, including units.',
    parameters: [
      { name: 'propertyId', type: 'string', description: 'The ID of the property to delete', required: true },
    ],
    category: 'properties',
    requiresConfirmation: true,
    enabled: true,
  },
  {
    name: 'save_memory_or_preference',
    description: 'Save user preferences, instructions, or things learned during conversations to remember them across sessions.',
    parameters: [
      { name: 'key', type: 'string', description: 'The identifier/key for this memory (e.g. "theme_preference", "user_nickname", "favorite_contractor")', required: true },
      { name: 'value', type: 'string', description: 'The content or value to store for this memory', required: true },
    ],
    category: 'system',
    requiresConfirmation: false,
    enabled: true,
  },
];
