import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { RealtimeGateway } from '../realtime.gateway';
import { OnboardingService } from '../onboarding/onboarding.service';
import { PropertiesService } from '../properties/properties.service';
import {
  AgentContext,
  ToolResult,
  ParsedPropertyData,
  ParsedTenant,
  ValidationError,
  FormField,
  ActivityLogEntry,
} from './agent.types';

@Injectable()
export class AgentToolsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly realtime: RealtimeGateway,
    private readonly onboarding: OnboardingService,
    private readonly properties: PropertiesService,
  ) {}

  // ─── PERMISSION GUARD ───
  canExecuteTool(toolName: string, context: AgentContext): { allowed: boolean; reason?: string } {
    if (!context.landlordId) {
      return { allowed: false, reason: 'No active session' };
    }

    const writeTools = ['create_property', 'log_activity'];
    // For now allow all tiers to write (can gate later)
    // if (writeTools.includes(toolName) && context.tier === 'free') {
    //   return { allowed: false, reason: 'Upgrade to Pro to use this feature' };
    // }

    return { allowed: true };
  }

  // ─── EMIT REAL-TIME LOG ───
  emitLog(landlordId: string, step: number, status: string, message: string, detail?: string) {
    this.realtime.sendNotification(landlordId, 'landlord', {
      id: `agent-log-${Date.now()}`,
      title: 'Agent',
      message: message,
      type: status === 'error' ? 'error' : 'info',
    });
  }

  // ─── TOOL: PARSE FILE WITH GEMINI ───
  async parseFile(fileBuffer: Buffer, mimeType: string, fileName: string, context: AgentContext): Promise<ToolResult> {
    const guard = this.canExecuteTool('parse_file', context);
    if (!guard.allowed) return { success: false, error: guard.reason, log: `Permission denied: ${guard.reason}` };

    this.emitLog(context.landlordId, 1, 'running', 'Uploading file to secure storage...');

    // 1. Upload to R2
    let fileUrl: string;
    try {
      const upload = await this.onboarding.uploadToR2(fileName, fileBuffer, mimeType);
      fileUrl = upload.publicUrl;
      this.emitLog(context.landlordId, 1, 'running', `File stored: ${fileName}`);
    } catch (err: any) {
      this.emitLog(context.landlordId, 1, 'error', `File upload failed: ${err.message}`);
      return { success: false, error: 'Failed to upload file', log: err.message };
    }

    // 2. Parse with Gemini Flash
    this.emitLog(context.landlordId, 1, 'running', 'Sending file to Gemini Flash for extraction...');

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return { success: false, error: 'Gemini API key not configured', log: 'Missing GEMINI_API_KEY' };
    }

    const base64Data = fileBuffer.toString('base64');
    const extractionPrompt = `You are an expert property management data extractor.

Read this file and extract ALL tenant/unit data. Return a JSON object with this exact shape:

{
  "property": {
    "name": "Best guess at property name from file, or 'Unnamed Property'",
    "address": "Address if found, or empty string",
    "type": "residential or commercial",
    "unitsCount": <total number of unique units>
  },
  "tenants": [
    {
      "name": "Full tenant name",
      "email": "tenant email or empty string if not found",
      "phone": "phone number or empty string if not found",
      "unit": "Unit identifier (e.g. 'Unit 3A', '101', etc.)",
      "rent": "Monthly rent as string with currency (e.g. 'KES 25,000')",
      "arrears": <number, amount owed, 0 if none>,
      "status": "Active or Arrears or Vacant"
    }
  ]
}

Rules:
- Extract EVERY row/tenant from the file, do not skip any
- If a field is missing, use empty string "" for strings and 0 for numbers
- Preserve the original unit identifiers exactly as written
- Convert all rent values to include currency prefix
- If arrears/balance column exists, use it; otherwise default to 0
- Return ONLY the JSON, no markdown or explanation`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: extractionPrompt },
              { inlineData: { mimeType, data: base64Data } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        // Retry once on rate limit
        if (response.status === 429) {
          this.emitLog(context.landlordId, 1, 'retry', 'Gemini rate limited. Retrying in 3s...');
          await new Promise(r => setTimeout(r, 3000));
          const retry = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: extractionPrompt }, { inlineData: { mimeType, data: base64Data } }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          });
          if (!retry.ok) {
            throw new Error(`Gemini retry failed: ${retry.status}`);
          }
          const retryData = await retry.json();
          const parsed = JSON.parse(retryData.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
          this.emitLog(context.landlordId, 1, 'success', `Retry succeeded. Found ${parsed.tenants?.length || 0} tenants.`);
          return { success: true, data: { ...parsed, fileUrl }, log: `Parsed ${parsed.tenants?.length || 0} tenants from ${fileName}` };
        }
        throw new Error(`Gemini API error ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini');

      const parsed: ParsedPropertyData = JSON.parse(rawText);
      this.emitLog(context.landlordId, 1, 'success', `Extracted ${parsed.tenants?.length || 0} tenants, ${parsed.property?.unitsCount || 0} units.`);

      return {
        success: true,
        data: { ...parsed, fileUrl },
        log: `Parsed ${parsed.tenants?.length || 0} tenants from ${fileName}`,
      };
    } catch (err: any) {
      this.emitLog(context.landlordId, 1, 'error', `Parsing failed: ${err.message}`);
      return { success: false, error: err.message, log: `Parse error: ${err.message}` };
    }
  }

  // ─── TOOL: VALIDATE DATA ───
  validateData(data: ParsedPropertyData): ToolResult {
    const errors: ValidationError[] = [];
    const gapFields: FormField[] = [];

    if (!data.property?.name || data.property.name === 'Unnamed Property') {
      gapFields.push({ key: 'propertyName', label: 'Property Name', fieldType: 'text', required: true, placeholder: 'e.g. Lumina Heights' });
    }
    if (!data.property?.address) {
      gapFields.push({ key: 'propertyAddress', label: 'Property Address', fieldType: 'text', required: true, placeholder: 'e.g. 123 Main St, Nairobi' });
    }

    const seenUnits = new Set<string>();
    const seenEmails = new Set<string>();

    (data.tenants || []).forEach((t, i) => {
      if (!t.name?.trim()) {
        errors.push({ row: i + 1, field: 'name', message: 'Tenant name is empty', tenantName: `Row ${i + 1}` });
      }

      if (t.email && seenEmails.has(t.email.toLowerCase())) {
        errors.push({ row: i + 1, field: 'email', message: `Duplicate email: ${t.email}`, tenantName: t.name });
      } else if (t.email) {
        seenEmails.add(t.email.toLowerCase());
      }

      if (!t.email?.trim()) {
        gapFields.push({
          key: `tenant_${i}_email`,
          label: `Email for ${t.name || `Row ${i + 1}`} (${t.unit || 'no unit'})`,
          fieldType: 'email',
          required: true,
          placeholder: 'tenant@email.com',
        });
      }

      if (!t.phone?.trim()) {
        gapFields.push({
          key: `tenant_${i}_phone`,
          label: `Phone for ${t.name || `Row ${i + 1}`} (${t.unit || 'no unit'})`,
          fieldType: 'tel',
          placeholder: '+254...',
        });
      }

      if (t.unit && seenUnits.has(t.unit)) {
        errors.push({ row: i + 1, field: 'unit', message: `Duplicate unit: ${t.unit}`, tenantName: t.name });
      } else if (t.unit) {
        seenUnits.add(t.unit);
      }

      if (!t.unit?.trim()) {
        errors.push({ row: i + 1, field: 'unit', message: 'Unit identifier missing', tenantName: t.name });
      }
    });

    const hasBlockingErrors = errors.length > 5;
    const hasGaps = gapFields.length > 0;

    return {
      success: errors.length === 0,
      data: { errors, gapFields, hasBlockingErrors, hasGaps },
      log: errors.length === 0
        ? `Validation passed. ${gapFields.length} optional fields missing.`
        : `${errors.length} errors, ${gapFields.length} gaps found.`,
    };
  }

  // ─── TOOL: APPLY GAP FILLS ───
  applyGapFills(data: ParsedPropertyData, fills: Record<string, string>): ParsedPropertyData {
    const result = JSON.parse(JSON.stringify(data)) as ParsedPropertyData;

    if (fills.propertyName) result.property.name = fills.propertyName;
    if (fills.propertyAddress) result.property.address = fills.propertyAddress;

    result.tenants.forEach((t, i) => {
      if (fills[`tenant_${i}_email`]) t.email = fills[`tenant_${i}_email`];
      if (fills[`tenant_${i}_phone`]) t.phone = fills[`tenant_${i}_phone`];
    });

    return result;
  }

  // ─── TOOL: UPLOAD PHOTO ───
  async uploadPhoto(fileBuffer: Buffer, mimeType: string, fileName: string, context: AgentContext): Promise<ToolResult> {
    const guard = this.canExecuteTool('upload_file', context);
    if (!guard.allowed) return { success: false, error: guard.reason, log: `Permission denied` };

    try {
      this.emitLog(context.landlordId, 2, 'running', 'Uploading property photo...');
      const upload = await this.onboarding.uploadToR2(fileName, fileBuffer, mimeType);
      this.emitLog(context.landlordId, 2, 'success', 'Photo uploaded.');
      return { success: true, data: { photoUrl: upload.publicUrl }, log: 'Photo uploaded' };
    } catch (err: any) {
      return { success: false, error: err.message, log: `Photo upload failed: ${err.message}` };
    }
  }

  // ─── TOOL: CREATE PROPERTY (DEPLOY) ───
  async createProperty(
    data: ParsedPropertyData,
    photoUrl: string | undefined,
    context: AgentContext,
  ): Promise<ToolResult> {
    const guard = this.canExecuteTool('create_property', context);
    if (!guard.allowed) return { success: false, error: guard.reason, log: `Permission denied` };

    this.emitLog(context.landlordId, 3, 'running', 'Writing property record to database...');

    try {
      // Build deploy payload matching PropertiesService.deploy() signature
      const invoices = data.tenants
        .filter(t => t.arrears > 0)
        .map(t => ({
          invoiceId: `INV-${Math.random().toString(36).substring(3, 9).toUpperCase()}`,
          tenantName: t.name,
          unitNumber: t.unit,
          amountDue: t.arrears,
          propertyName: data.property.name,
          status: 'Unpaid' as const,
        }));

      this.emitLog(context.landlordId, 3, 'running', `Creating ${data.tenants.length} tenant records...`);

      const result = await this.properties.deploy(context.landlordId, {
        property: {
          name: data.property.name,
          location: data.property.address,
          type: data.property.type || 'residential',
          unitsCount: data.property.unitsCount || data.tenants.length,
        },
        tenants: data.tenants.map(t => ({
          name: t.name,
          email: t.email,
          phone: t.phone,
          unit: t.unit,
          rent: t.rent,
          arrears: t.arrears,
          status: t.arrears > 0 ? 'Arrears' : (t.status || 'Active'),
        })),
        invoices,
      });

      // Update photo_url if provided
      if (photoUrl && result.properties?.[0]?.id) {
        try {
          await this.db.sql`UPDATE properties SET photo_url = ${photoUrl} WHERE id = ${result.properties[0].id}`;
        } catch (err) {
          console.warn('Failed to set property photo:', err);
        }
      }

      if (invoices.length > 0) {
        this.emitLog(context.landlordId, 3, 'running', `Auto-generated ${invoices.length} arrears invoices.`);
      }

      this.emitLog(context.landlordId, 3, 'success', `Property "${data.property.name}" deployed with ${data.tenants.length} tenants.`);

      // Log activity
      await this.logActivity(context.landlordId, 'property_created', 
        `Created property "${data.property.name}" at "${data.property.address}" with ${data.tenants.length} tenants and ${invoices.length} invoices.`,
        'create_property', 'success');

      return {
        success: true,
        data: {
          property: result.properties?.[0],
          tenantsCreated: result.tenants?.length || 0,
          invoicesCreated: result.invoices?.length || 0,
        },
        log: `Deployed "${data.property.name}" — ${data.tenants.length} tenants, ${invoices.length} invoices`,
      };
    } catch (err: any) {
      this.emitLog(context.landlordId, 3, 'error', `Deploy failed: ${err.message}`);
      await this.logActivity(context.landlordId, 'property_create_failed', err.message, 'create_property', 'error', err.message);
      return { success: false, error: err.message, log: `Deploy error: ${err.message}` };
    }
  }

  // ─── TOOL: LOG ACTIVITY ───
  async logActivity(
    landlordId: string,
    action: string,
    description: string,
    toolName?: string,
    status: string = 'success',
    errorMessage?: string,
  ) {
    try {
      await this.db.sql`
        INSERT INTO agent_activity_log (landlord_id, action, description, tool_name, status, error_message)
        VALUES (${landlordId}, ${action}, ${description}, ${toolName || null}, ${status}, ${errorMessage || null})
      `;
    } catch (err) {
      console.error('Failed to log agent activity:', err);
    }
  }

  // ─── TOOL: GET ACTIVITY LOG ───
  async getActivityLog(landlordId: string, hours: number = 24): Promise<ActivityLogEntry[]> {
    try {
      const rows = await this.db.sql`
        SELECT id, landlord_id as "landlordId", action, description, tool_name as "toolName", status, created_at as "createdAt"
        FROM agent_activity_log
        WHERE landlord_id = ${landlordId}
          AND created_at > NOW() - INTERVAL '${hours} hours'
        ORDER BY created_at DESC
        LIMIT 50
      `;
      return rows;
    } catch (err) {
      console.error('Failed to get activity log:', err);
      return [];
    }
  }

  // ─── TOOL: EDIT DATA WITH DEEPSEEK ───
  async editDataWithAI(currentData: ParsedPropertyData, editInstruction: string, context: AgentContext): Promise<ToolResult> {
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) return { success: false, error: 'DeepSeek key not configured', log: 'Missing key' };

    this.emitLog(context.landlordId, 2, 'running', 'Processing data edit with AI...');

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are a data editor. You receive property/tenant data and an edit instruction. Apply the edit and return the FULL updated data in the exact same JSON schema. Do not add commentary, just return valid JSON.`,
            },
            {
              role: 'user',
              content: `Current data:\n${JSON.stringify(currentData, null, 2)}\n\nEdit instruction: ${editInstruction}`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);

      const data = await response.json();
      const editedStr = data.choices?.[0]?.message?.content;
      const edited = JSON.parse(editedStr);

      this.emitLog(context.landlordId, 2, 'success', 'Data edit applied.');
      return { success: true, data: edited, log: `Applied edit: "${editInstruction}"` };
    } catch (err: any) {
      this.emitLog(context.landlordId, 2, 'error', `Edit failed: ${err.message}`);
      return { success: false, error: err.message, log: `Edit error: ${err.message}` };
    }
  }
}
