import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { RealtimeGateway } from '../realtime.gateway';
import { PropertiesService } from '../properties/properties.service';
import { TicketsService } from '../tickets/tickets.service';
import { AuthService } from '../auth/auth.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentContext, ToolResult } from './agent.types';
import { CommunicationService } from '../communication/communication.service';
import { TOOL_REGISTRY } from './tool-registry';

@Injectable()
export class SophiaToolsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly realtime: RealtimeGateway,
    private readonly properties: PropertiesService,
    private readonly tickets: TicketsService,
    private readonly auth: AuthService,
    private readonly legacyTools: AgentToolsService,
    private readonly communication: CommunicationService,
  ) {}

  // ─── STATUS NARRATOR ───
  private narrate(ctx: AgentContext, msg: string) {
    const targetId = ctx.role === 'tenant' ? ctx.tenantEmail || '' : ctx.landlordId;
    const targetRole = ctx.role === 'tenant' ? 'tenant' : 'landlord';
    this.realtime.sendNotification(targetId, targetRole, {
      id: `sophia-${Date.now()}`,
      title: 'Sophia',
      message: msg,
      type: 'info',
    });
  }

  // ─── EXECUTE ANY TOOL BY NAME ───
  async executeTool(name: string, args: Record<string, any>, ctx: AgentContext): Promise<ToolResult> {
    const start = Date.now();
    let result: ToolResult;

    try {
      switch (name) {
        case 'list_properties': result = await this.listProperties(ctx); break;
        case 'get_property_detail': result = await this.getPropertyDetail(args.propertyId, ctx); break;
        case 'create_property': result = await this.createPropertySimple(args, ctx); break;
        case 'list_tenants': result = await this.listTenants(ctx); break;
        case 'invite_tenant': result = await this.inviteTenant(args, ctx); break;
        case 'find_vacant_units': result = await this.findVacantUnits(args.propertyId, ctx); break;
        case 'list_invoices': result = await this.listInvoices(args.status, ctx); break;
        case 'create_invoice': result = await this.createInvoice(args, ctx); break;
        case 'reconcile_invoice': result = await this.reconcileInvoice(args, ctx); break;
        case 'tenant_create_maintenance_request': result = await this.tenantCreateMaintenanceRequest(args, ctx); break;
        case 'tenant_get_arrears': result = await this.tenantGetArrears(ctx); break;
        case 'tenant_list_invoices': result = await this.tenantListInvoices(ctx); break;
        case 'tenant_get_maintenance_status': result = await this.tenantGetMaintenanceStatus(args, ctx); break;
        case 'tenant_get_last_payment': result = await this.tenantGetLastPayment(ctx); break;
        case 'tenant_get_summary': result = await this.tenantGetSummary(ctx); break;
        case 'create_maintenance_request': result = await this.createMaintenanceRequest(args, ctx); break;
        case 'list_tickets': result = await this.listTickets(args.status, args.showHistory, ctx); break;
        case 'list_contractors': result = await this.listContractors(ctx); break;
        case 'assign_contractor': result = await this.assignContractor(args, ctx); break;
        case 'smart_assign_contractor': result = await this.smartAssignContractor(args.ticketId, ctx); break;
        case 'get_analytics': result = await this.getAnalytics(ctx); break;
        case 'get_audit_log': result = await this.getAuditLog(args.hours, ctx); break;
        case 'get_agent_activity': result = await this.getAgentActivity(args.limit, ctx); break;
        case 'send_tenant_message': result = await this.sendTenantMessage(args, ctx); break;
        case 'remove_tenant': result = await this.removeTenant(args.tenantId, ctx); break;
        case 'delete_property': result = await this.deleteProperty(args.propertyId, ctx); break;
        case 'save_memory_or_preference': result = await this.saveMemoryOrPreference(args, ctx); break;
        default: result = { success: false, error: `Unknown tool: ${name}`, log: `Unknown tool ${name}` };
      }
    } catch (err: any) {
      result = { success: false, error: err.message, log: `Tool ${name} crashed: ${err.message}` };
    }

    const duration = Date.now() - start;
    await this.logToolCall(ctx.landlordId, name, args, result, duration);
    return result;
  }

  // ─── PROPERTIES ───

  private async listProperties(ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Reading your property portfolio...');
    const props = await this.properties.findAll(ctx.landlordId);
    return { success: true, data: props, log: `Found ${props.length} properties` };
  }

  private async getPropertyDetail(propertyId: string, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Loading property details...`);
    const prop = await this.properties.findOne(propertyId, ctx.landlordId);
    if (!prop) return { success: false, error: 'Property not found', log: 'Property not found' };
    const tenants = await this.db.sql`
      SELECT id, name, email, phone, unit, rent, arrears, status
      FROM tenant_contacts WHERE property_id = ${propertyId} AND landlord_id = ${ctx.landlordId}
    `;
    return { success: true, data: { ...prop, tenants }, log: `Property "${prop.name}" with ${tenants.length} tenants` };
  }

  private async createPropertySimple(args: any, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Creating property "${args.name}"...`);
    const prop = await this.properties.create({
      name: args.name,
      address: args.address,
      landlordId: ctx.landlordId,
      unitsCount: args.unitsCount,
    });
    await this.legacyTools.logActivity(ctx.landlordId, 'property_created', `Created "${args.name}" at "${args.address}" with ${args.unitsCount} units`, 'create_property');
    return { success: true, data: prop, log: `Created property "${args.name}"` };
  }

  // ─── TENANTS ───

  private async listTenants(ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Loading tenant records...');
    const tenants = await this.properties.findTenants(ctx.landlordId);
    const active = tenants.filter((t: any) => t.name && t.name.trim() !== '' && t.status?.toLowerCase() !== 'vacant');
    return { success: true, data: active, log: `Found ${active.length} active tenants` };
  }

  private async inviteTenant(args: any, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Generating invite for ${args.tenantName}...`);
    try {
      const inviteResult = await this.auth.generateLinkCode({
        landlordId: ctx.landlordId,
        targetRole: 'tenant',
        propertyId: args.propertyId,
        unit: args.unit,
        createdById: ctx.landlordId,
        email: args.tenantEmail,
      });
      // Create rent invoice
      const propRows = await this.db.sql`SELECT name FROM properties WHERE id = ${args.propertyId} LIMIT 1`;
      const propName = propRows[0]?.name || args.propertyId;
      await this.properties.createSingleInvoice(ctx.landlordId, ctx.landlordName, {
        tenantEmail: args.tenantEmail,
        tenantName: args.tenantName,
        unitNumber: args.unit,
        amountDue: args.rentAmount,
        propertyName: propName,
        description: 'First Month Rent',
      });
      this.narrate(ctx, `Invite created for ${args.tenantName} — code ready`);
      return { success: true, data: { code: inviteResult.code, tenantName: args.tenantName, unit: args.unit }, log: `Invited ${args.tenantName} to unit ${args.unit}` };
    } catch (err: any) {
      return { success: false, error: err.message, log: `Invite failed: ${err.message}` };
    }
  }

  private async findVacantUnits(propertyId: string, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Checking vacant units...');
    const result = await this.properties.findVacantUnits(propertyId, ctx.landlordId);
    return { success: true, data: result, log: `Found ${result.vacantUnits?.length || 0} vacant units` };
  }

  // ─── FINANCE ───

  private async listInvoices(status: string | undefined, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Reading invoices...');
    const all = await this.db.sql`
      SELECT id as "invoiceId", tenant_name as "tenantName", unit_number as "unitNumber",
             amount_due as "amountDue", property_name as "propertyName", status
      FROM invoices WHERE landlord_id = ${ctx.landlordId} ORDER BY id DESC
    `;
    const filtered = (!status || status === 'all') ? all : all.filter((i: any) => i.status === status);
    return { success: true, data: filtered, log: `Found ${filtered.length} invoices` };
  }

  private async createInvoice(args: any, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Drafting invoice for ${args.tenantName}...`);
    const result = await this.properties.createSingleInvoice(ctx.landlordId, ctx.landlordName, {
      tenantEmail: args.tenantEmail,
      tenantName: args.tenantName,
      unitNumber: args.unitNumber,
      amountDue: args.amountDue,
      propertyName: args.propertyName,
      description: args.description,
    });
    return { success: true, data: result, log: `Created invoice for ${args.tenantName} — ${args.amountDue}` };
  }

  private async reconcileInvoice(args: any, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Reconciling invoice ${args.invoiceId}...`);
    const result = await this.properties.reconcileInvoice(args.invoiceId, ctx.landlordId, {
      amountPaid: args.amountPaid,
      description: args.description,
      operatorName: 'Sophia (AI)',
    });
    return { success: result.success, data: result, error: result.success ? undefined : 'Reconciliation failed', log: `Reconciled ${args.invoiceId}` };
  }

  // ─── MAINTENANCE ───

  private async createMaintenanceRequest(args: any, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Opening maintenance request for ${args.tenantEmail}...`);
    const ticket = await this.tickets.create({
      description: args.description,
      urgency: args.urgency,
      tenantId: args.tenantEmail,
    });
    return {
      success: true,
      data: ticket,
      log: `Created maintenance request ${ticket.id} for ${args.tenantEmail}`,
    };
  }

  private async listTickets(status: string | undefined, showHistory: boolean | undefined, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Loading maintenance tickets...');
    const all = await this.tickets.findAll();
    
    let filtered = all;
    if (status && status !== 'all') {
      filtered = all.filter((t: any) => t.status === status);
    } else if (showHistory === true || status === 'all') {
      filtered = all;
    } else {
      // Default: exclude completed and rejected
      filtered = all.filter((t: any) => t.status !== 'completed' && t.status !== 'rejected');
    }
    return { success: true, data: filtered, log: `Found ${filtered.length} tickets` };
  }

  private async listContractors(ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Scanning contractor roster...');
    const contractors = await this.tickets.findContractors();
    return { success: true, data: contractors, log: `Found ${contractors.length} contractors` };
  }

  private async assignContractor(args: any, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Sending hire offer to contractor #${args.contractorId}...`);
    const ticket = await this.tickets.hireContractor(args.ticketId, args.contractorId, args.amount);
    if (!ticket) return { success: false, error: 'Ticket not found', log: 'Assignment failed' };
    return { success: true, data: ticket, log: `Assigned contractor #${args.contractorId} to ticket ${args.ticketId} at ${args.amount}` };
  }

  private async smartAssignContractor(ticketId: string, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Analyzing ticket and scanning contractors...');

    // Get ticket details
    const ticketRows = await this.db.sql`SELECT * FROM tickets WHERE id = ${ticketId} LIMIT 1`;
    if (!ticketRows || ticketRows.length === 0) return { success: false, error: 'Ticket not found', log: 'Ticket not found' };
    const ticket = ticketRows[0];

    // Get available contractors
    const contractors = await this.tickets.findContractors();
    const available = contractors.filter((c: any) => c.status === 'available');
    if (available.length === 0) return { success: false, error: 'No available contractors', log: 'No contractors available' };

    // Use DeepSeek to match
    this.narrate(ctx, `Matching "${ticket.description}" against ${available.length} contractors...`);
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) return { success: false, error: 'DeepSeek not configured', log: 'Missing key' };

    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: `Pick the best contractor for this job. You MUST prioritize the contractor with the lowest hourly rate if multiple contractors matching the required specialty are available. Return JSON: { "contractorId": number, "reason": string, "suggestedAmount": number }` },
            { role: 'user', content: `Ticket: "${ticket.description}" (urgency: ${ticket.urgency})\nContractors:\n${available.map((c: any) => `ID:${c.id} Name:${c.name} Specialty:${c.specialty} Rate:${c.hourlyRate || 100}/hr`).join('\n')}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
        }),
      });
      const data = await res.json();
      const match = JSON.parse(data.choices?.[0]?.message?.content || '{}');

      if (!match.contractorId) return { success: false, error: 'Could not find a match', log: 'No match' };

      const matched = available.find((c: any) => c.id === match.contractorId);
      this.narrate(ctx, `Best match: ${matched?.name || 'Unknown'} — assigning at ${match.suggestedAmount}...`);

      const assigned = await this.tickets.hireContractor(ticketId, match.contractorId, match.suggestedAmount);
      return {
        success: true,
        data: { ticket: assigned, contractor: matched, reason: match.reason, amount: match.suggestedAmount },
        log: `Smart-assigned ${matched?.name} to ticket at ${match.suggestedAmount}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message, log: `Smart assign failed: ${err.message}` };
    }
  }

  // ─── ANALYTICS ───

  private async getAnalytics(ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Crunching portfolio numbers...');
    const props = await this.properties.findAll(ctx.landlordId);
    const tenants = await this.properties.findTenants(ctx.landlordId);
    const invoices = await this.db.sql`SELECT status, amount_due FROM invoices WHERE landlord_id = ${ctx.landlordId}`;

    const activeTenants = tenants.filter((t: any) => t.name && t.name.trim() !== '' && t.status?.toLowerCase() !== 'vacant');
    const totalUnits = props.reduce((s: number, p: any) => s + (p.unitsCount || 0), 0);
    const occupancy = totalUnits > 0 ? ((activeTenants.length / totalUnits) * 100).toFixed(1) : '0';
    const mrr = activeTenants.reduce((s: number, t: any) => s + (parseFloat(String(t.rent).replace(/[^0-9.]/g, '')) || 0), 0);
    const totalArrears = activeTenants.reduce((s: number, t: any) => s + (Number(t.arrears) || 0), 0);
    const totalInvoiced = invoices.reduce((s: number, i: any) => s + (Number(i.amount_due) || 0), 0);
    const totalPaid = invoices.filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (Number(i.amount_due) || 0), 0);
    const collectionRate = totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : '0';

    return {
      success: true,
      data: {
        properties: props.length,
        totalUnits,
        activeTenants: activeTenants.length,
        occupancyRate: `${occupancy}%`,
        mrr,
        totalArrears,
        collectionRate: `${collectionRate}%`,
        unpaidInvoices: invoices.filter((i: any) => i.status === 'Unpaid').length,
      },
      log: `Portfolio: ${props.length} properties, ${occupancy}% occupancy, MRR ${mrr}`,
    };
  }

  private async getAuditLog(hours: number = 24, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, 'Pulling audit trail...');
    const logs = await this.properties.findAuditLogs(ctx.landlordId);
    return { success: true, data: logs || [], log: `Found ${(logs || []).length} audit entries` };
  }

  private async getAgentActivity(limit: number = 50, ctx: AgentContext): Promise<ToolResult> {
    const rows = await this.db.sql`
      SELECT id, action, description, tool_name as "toolName", input_summary as "inputSummary",
             output_summary as "outputSummary", status, error_message as "errorMessage",
             duration_ms as "durationMs", model_used as "modelUsed", created_at as "createdAt"
      FROM agent_activity_log
      WHERE landlord_id = ${ctx.landlordId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return { success: true, data: rows, log: `Found ${rows.length} agent activity entries` };
  }

  // ─── TOOL CALL LOGGING ───

  private async logToolCall(landlordId: string, toolName: string, input: any, result: ToolResult, durationMs: number) {
    try {
      const inputSummary = JSON.stringify(input || {}).substring(0, 500);
      const outputSummary = result.log || (result.success ? 'OK' : result.error || 'Failed');
      await this.db.sql`
        INSERT INTO agent_activity_log (landlord_id, action, description, tool_name, input_summary, output_summary, status, error_message, duration_ms, model_used)
        VALUES (${landlordId}, ${'tool_call'}, ${result.log}, ${toolName}, ${inputSummary}, ${outputSummary}, ${result.success ? 'success' : 'error'}, ${result.error || null}, ${durationMs}, ${'sophia'})
      `;
    } catch (err) {
      console.error('Failed to log tool call:', err);
    }
  }

  // ─── EXTRA UTILS FOR TENANTS & PROPERTIES ───

  private async sendTenantMessage(args: any, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Sending message to tenant: ${args.tenantEmail}...`);
    const sent = await this.communication.sendCriticalNotification(args.tenantEmail, args.subject, args.message);
    if (!sent) return { success: false, error: 'Email delivery failed', log: `Failed to email ${args.tenantEmail}` };
    return { success: true, data: { sent: true }, log: `Emailed ${args.tenantEmail}: "${args.subject}"` };
  }

  private async removeTenant(tenantId: string, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Removing tenant record ${tenantId}...`);
    const rows = await this.db.sql`
      DELETE FROM tenant_contacts
      WHERE id = ${tenantId} AND landlord_id = ${ctx.landlordId}
      RETURNING id, name
    `;
    if (!rows || rows.length === 0) return { success: false, error: 'Tenant contact not found', log: 'Tenant not found' };
    const name = rows[0].name;
    return { success: true, data: { deletedId: tenantId }, log: `Removed tenant "${name}"` };
  }

  private async deleteProperty(propertyId: string, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Deleting property ${propertyId}...`);
    
    // First delete or unlink tenants associated with property
    await this.db.sql`
      DELETE FROM tenant_contacts
      WHERE property_id = ${propertyId} AND landlord_id = ${ctx.landlordId}
    `;

    const rows = await this.db.sql`
      DELETE FROM properties
      WHERE id = ${propertyId} AND landlord_id = ${ctx.landlordId}
      RETURNING id, name
    `;
    if (!rows || rows.length === 0) return { success: false, error: 'Property not found', log: 'Property not found' };
    const name = rows[0].name;
    return { success: true, data: { deletedId: propertyId }, log: `Deleted property "${name}"` };
  }

  private async saveMemoryOrPreference(args: any, ctx: AgentContext): Promise<ToolResult> {
    const fs = require('fs');
    const path = require('path');
    const dirPath = path.join(__dirname, 'memories');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, `${ctx.landlordId}.json`);
    let memories: Record<string, string> = {};
    if (fs.existsSync(filePath)) {
      try {
        memories = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {}
    }
    memories[args.key] = args.value;
    fs.writeFileSync(filePath, JSON.stringify(memories, null, 2), 'utf-8');
    this.narrate(ctx, `Learned user preference: "${args.key}" = "${args.value}".`);
    return {
      success: true,
      data: { key: args.key, value: args.value },
      log: `Saved memory/preference: "${args.key}" = "${args.value}"`
    };
  }

  // ─── TENANT ASSISTANT HANDLERS ───

  private async tenantCreateMaintenanceRequest(args: any, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Opening maintenance request...`);
    const ticket = await this.tickets.create({
      description: args.description,
      urgency: args.urgency,
      tenantId: ctx.tenantEmail || '',
    });
    return {
      success: true,
      data: ticket,
      log: `Created maintenance request ${ticket.id} with description: "${args.description}"`,
    };
  }

  private async tenantGetArrears(ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Checking your balance due...`);
    const rows = await this.db.sql`
      SELECT arrears, rent
      FROM tenant_contacts
      WHERE email = ${ctx.tenantEmail || ''}
      LIMIT 1
    `;
    const arrears = rows[0]?.arrears !== undefined ? Number(rows[0].arrears) : 0;
    const rent = rows[0]?.rent !== undefined ? Number(rows[0].rent) : 0;
    return {
      success: true,
      data: { arrears, rent },
      log: `Arrears/Outstanding balance is €${arrears.toLocaleString()} and monthly rent is €${rent.toLocaleString()}`,
    };
  }

  private async tenantListInvoices(ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Checking your billing history...`);
    const invoices = await this.db.sql`
      SELECT id, amount, status, description, created_at as "createdAt"
      FROM invoices
      WHERE LOWER(tenant_email) = LOWER(${ctx.tenantEmail || ''})
      ORDER BY created_at DESC
    `;
    return {
      success: true,
      data: invoices,
      log: `Found ${invoices.length} invoices in billing history`,
    };
  }

  private async tenantGetMaintenanceStatus(args: { showHistory?: boolean } | undefined, ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Checking your maintenance requests...`);
    const tickets = await this.tickets.findAllByTenant(ctx.tenantEmail || '');
    const showHistory = args?.showHistory === true;
    const filtered = showHistory ? tickets : tickets.filter((t: any) => t.status !== 'completed' && t.status !== 'rejected');
    return {
      success: true,
      data: filtered,
      log: `Found ${filtered.length} maintenance tickets`,
    };
  }

  private async tenantGetLastPayment(ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Checking your payment history...`);
    const rows = await this.db.sql`
      SELECT amount, description, created_at as "createdAt"
      FROM invoices
      WHERE LOWER(tenant_email) = LOWER(${ctx.tenantEmail || ''}) AND status = 'Paid'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return {
      success: true,
      data: rows[0] || null,
      log: rows[0] ? `Last payment of €${Number(rows[0].amount).toLocaleString()} for "${rows[0].description}" on ${new Date(rows[0].createdAt).toLocaleDateString()}` : 'No payment records found',
    };
  }

  private async tenantGetSummary(ctx: AgentContext): Promise<ToolResult> {
    this.narrate(ctx, `Generating overall summary...`);
    const contactRows = await this.db.sql`
      SELECT property_name as "propertyName", unit, arrears, rent
      FROM tenant_contacts
      WHERE email = ${ctx.tenantEmail || ''}
      LIMIT 1
    `;
    const profile = contactRows[0] || {};
    const invoices = await this.db.sql`
      SELECT id, amount, status, description, created_at as "createdAt"
      FROM invoices
      WHERE LOWER(tenant_email) = LOWER(${ctx.tenantEmail || ''})
      ORDER BY created_at DESC
    `;
    const tickets = await this.tickets.findAllByTenant(ctx.tenantEmail || '');
    
    return {
      success: true,
      data: {
        profile,
        invoicesCount: invoices.length,
        unpaidInvoices: invoices.filter((i: any) => i.status !== 'Paid'),
        ticketsCount: tickets.length,
        activeTickets: tickets.filter((t: any) => t.status !== 'completed' && t.status !== 'rejected'),
      },
      log: `Successfully summarized billing and maintenance records.`,
    };
  }

  // ─── TOOL CONFIG (per-landlord enable/disable) ───

  async getToolConfig(landlordId: string) {
    const config = await this.db.sql`SELECT tool_name as "toolName", enabled, requires_approval as "requiresApproval" FROM agent_tool_config WHERE landlord_id = ${landlordId}`;
    const configMap = new Map<string, any>(config.map((c: any) => [c.toolName, c]));

    return TOOL_REGISTRY.map(t => {
      const override = configMap.get(t.name);
      return {
        name: t.name,
        description: t.description,
        enabled: override !== undefined ? override.enabled : t.enabled,
        requiresApproval: override !== undefined ? override.requiresApproval : t.requiresConfirmation,
      };
    });
  }

  async setToolConfig(landlordId: string, toolName: string, enabled: boolean, requiresApproval: boolean) {
    await this.db.sql`
      INSERT INTO agent_tool_config (landlord_id, tool_name, enabled, requires_approval)
      VALUES (${landlordId}, ${toolName}, ${enabled}, ${requiresApproval})
      ON CONFLICT (landlord_id, tool_name) DO UPDATE SET enabled = ${enabled}, requires_approval = ${requiresApproval}
    `;
    return { success: true };
  }
}
