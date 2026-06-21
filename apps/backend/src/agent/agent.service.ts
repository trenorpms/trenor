import { Injectable } from '@nestjs/common';
import { AgentToolsService } from './agent-tools.service';
import { PropertiesService } from '../properties/properties.service';
import { SophiaOrchestratorService } from './sophia-orchestrator.service';
import { DatabaseService } from '../database.service';
import {
  AgentContext,
  AgentResponseBlock,
  AgentRunResponse,
  ConversationState,
  ParsedPropertyData,
} from './agent.types';

@Injectable()
export class AgentService {
  constructor(
    private readonly tools: AgentToolsService,
    private readonly properties: PropertiesService,
    private readonly sophia: SophiaOrchestratorService,
    private readonly db: DatabaseService,
  ) {}

  // ─── BUILD AGENT CONTEXT ───
  async buildContext(landlordId: string, landlordName: string, landlordEmail: string): Promise<AgentContext> {
    let propertiesCount = 0;
    let tenantsCount = 0;
    try {
      const props = await this.properties.findAll(landlordId);
      propertiesCount = props.length;
      const tenants = await this.properties.findTenants(landlordId);
      tenantsCount = tenants.length;
    } catch {}

    return {
      landlordId,
      landlordName,
      landlordEmail,
      tier: 'partner', // Default for now
      propertiesCount,
      tenantsCount,
    };
  }

  // ─── INTENT CLASSIFICATION (DeepSeek) ───
  async classifyIntent(message: string): Promise<string> {
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) return 'unknown';

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
              content: `Classify the user's intent into exactly ONE of these categories. Return ONLY the category string, nothing else.

Categories:
- property_listing (wants to add/list/onboard a new property, upload tenant data, etc.)
- invoice_generation (wants to create/generate/draft invoices)
- maintenance_dispatch (wants to handle repairs or maintenance)
- activity_recall (wants to know what AI did recently, asking about history)
- tenant_query (asking about tenants, looking up info)
- general_chat (casual question, greeting, help request, anything else)`,
            },
            { role: 'user', content: message },
          ],
          temperature: 0,
          max_tokens: 20,
        }),
      });

      if (!response.ok) return 'general_chat';
      const data = await response.json();
      const intent = data.choices?.[0]?.message?.content?.trim().toLowerCase().replace(/[^a-z_]/g, '');
      return intent || 'general_chat';
    } catch {
      return 'general_chat';
    }
  }

  // ─── GENERATE CONVERSATIONAL RESPONSE (DeepSeek) ───
  async generateResponse(message: string, context: AgentContext, additionalContext?: string): Promise<string> {
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) return 'I need the AI service to be configured to help you.';

    try {
      const systemPrompt = `You are the AI assistant for Trenor, a property management platform.
You are speaking with ${context.landlordName} (${context.landlordEmail}).
They manage ${context.propertiesCount} properties and ${context.tenantsCount} tenants.
Keep responses concise, helpful, and professional. No jargon or marketing fluff.
${additionalContext || ''}`;

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) return 'Something went wrong processing your request.';
      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || 'I\'m not sure how to help with that.';
    } catch {
      return 'Connection error. Please try again.';
    }
  }

  // ─── MAIN ORCHESTRATOR ───
  async run(
    action: string,
    context: AgentContext,
    message?: string,
    fileBuffer?: Buffer,
    fileMimeType?: string,
    fileName?: string,
    formData?: Record<string, string>,
    conversationState?: ConversationState,
    chatHistory?: any[],
    onChunk?: (data: { blocks: any[]; conversationState: any }) => void,
  ): Promise<AgentRunResponse> {
    const state: ConversationState = conversationState || { step: 'idle', history: [] };
    const blocks: AgentResponseBlock[] = [];

    // Push current step to history for "go back"
    const pushHistory = () => {
      if (!state.history) state.history = [];
      state.history.push(state.step || 'idle');
    };

    try {
      switch (action) {
        // ─── CHAT (initial message or follow-up) ───
        case 'chat': {
          if (!message) {
            blocks.push({ type: 'text', content: 'How can I help you today?' });
            break;
          }

          const isActiveWizard = state.step && state.step !== 'idle' && state.step !== 'complete';
          if (isActiveWizard) {
            const lowerMessage = message.toLowerCase();
            const isEditCommand = lowerMessage.includes('change') || lowerMessage.includes('edit') || lowerMessage.includes('update') || lowerMessage.includes('set');
            if (isEditCommand) {
              return this.run('edit_data', context, message, fileBuffer, fileMimeType, fileName, formData, state, undefined, onChunk);
            }
          }

          // Delegate to new Sophia orchestrator for general/action queries
          return this.sophia.run(message, context, state, chatHistory, onChunk);
        }

        // ─── FILE UPLOAD ───
        case 'upload_file': {
          if (!fileBuffer || !fileMimeType || !fileName) {
            blocks.push({ type: 'error', message: 'No file received.', suggestion: 'Try uploading the file again.' });
            break;
          }

          // Check file size (free tier: 200 rows limit enforced after parse)
          pushHistory();

          const parseResult = await this.tools.parseFile(fileBuffer, fileMimeType, fileName, context);

          if (!parseResult.success) {
            blocks.push({
              type: 'error',
              message: `Failed to read the file: ${parseResult.error}`,
              suggestion: 'Make sure the file contains tenant data with columns like Name, Email, Unit, Rent.',
            });
            break;
          }

          const parsed: ParsedPropertyData & { fileUrl: string } = parseResult.data;
          state.parsedData = { property: parsed.property, tenants: parsed.tenants };
          state.fileUrl = parsed.fileUrl;

          // Validate
          const validation = this.tools.validateData(state.parsedData);
          const { errors, gapFields, hasBlockingErrors, hasGaps } = validation.data;
          state.validationErrors = errors;

          if (hasBlockingErrors) {
            // Too many errors — ask user to fix the file
            state.step = 'awaiting_file';
            blocks.push({
              type: 'text',
              content: `I found ${parsed.tenants?.length || 0} tenants but there are ${errors.length} problems. The file needs fixing before I can proceed:`,
            });
            blocks.push({
              type: 'data_table',
              title: 'Issues Found',
              columns: [
                { key: 'row', label: 'Row' },
                { key: 'field', label: 'Field' },
                { key: 'message', label: 'Issue' },
                { key: 'tenantName', label: 'Tenant' },
              ],
              rows: errors,
              editable: false,
            });
            blocks.push({
              type: 'text',
              content: 'Fix these in your file and upload again, or tell me what to change.',
            });
          } else if (hasGaps) {
            // Some fields missing — ask for them
            state.step = 'awaiting_gaps';
            state.gapFields = gapFields;

            blocks.push({
              type: 'text',
              content: `I extracted [green]${parsed.tenants?.length || 0} tenants[/green] from **"${fileName}"**. [red]${gapFields.length} fields[/red] are missing — fill them in below:`,
            });
            blocks.push({
              type: 'form',
              fields: gapFields,
              submitLabel: 'Fill Gaps & Continue',
              onSubmitAction: 'submit_form',
            });

            if (errors.length > 0) {
              blocks.push({
                type: 'text',
                content: `Also found ${errors.length} minor issues (duplicate units, etc.) — I'll handle those automatically.`,
              });
            }
          } else {
            // Clean data — show review
            state.step = 'awaiting_photo';
            blocks.push({
              type: 'text',
              content: `Extracted [green]${parsed.tenants?.length || 0} tenants[/green] from **"${fileName}"**. Everything looks [green]clean[/green]. Here is the parsed ledger:`,
            });
            blocks.push({
              type: 'data_table',
              title: `${parsed.property.name} — ${parsed.property.address}`,
              columns: [
                { key: 'unit', label: 'Unit' },
                { key: 'name', label: 'Tenant' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { key: 'rent', label: 'Rent' },
                { key: 'arrears', label: 'Arrears' },
                { key: 'status', label: 'Status' },
              ],
              rows: parsed.tenants,
              editable: false,
            });
            blocks.push({
              type: 'text',
              content: 'Want to edit anything? Just tell me (e.g. *"change unit 3A rent to KES 30,000"*). Otherwise, upload a property photo so it\'s easy to identify in your portfolio:',
            });
            blocks.push({
              type: 'image_upload',
              label: 'Property photo (optional)',
              description: 'Makes your property easy to spot in the portfolio view.',
              onUploadAction: 'upload_photo',
            });
            blocks.push({
              type: 'confirmation',
              title: 'Ready to Deploy',
              summary: {
                property: parsed.property.name,
                address: parsed.property.address,
                tenants: parsed.tenants.length,
                units: parsed.property.unitsCount,
                arrearsInvoices: parsed.tenants.filter(t => t.arrears > 0).length,
              },
              confirmAction: 'confirm_deploy',
              cancelAction: 'go_back',
            });
          }
          break;
        }

        // ─── FORM SUBMISSION (gap fills) ───
        case 'submit_form': {
          if (!state.parsedData || !formData) {
            blocks.push({ type: 'error', message: 'Missing data context. Please start over.' });
            state.step = 'idle';
            break;
          }

          pushHistory();
          state.parsedData = this.tools.applyGapFills(state.parsedData, formData);
          state.filledGaps = formData;
          state.step = 'awaiting_photo';

          blocks.push({
            type: 'text',
            content: 'Gaps filled. Here\'s your updated data:',
          });
          blocks.push({
            type: 'data_table',
            title: `${state.parsedData.property.name} — ${state.parsedData.property.address}`,
            columns: [
              { key: 'unit', label: 'Unit' },
              { key: 'name', label: 'Tenant' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'rent', label: 'Rent' },
              { key: 'arrears', label: 'Arrears' },
            ],
            rows: state.parsedData.tenants,
            editable: false,
          });
          blocks.push({
            type: 'text',
            content: 'Upload a photo of the property, or skip and deploy:',
          });
          blocks.push({
            type: 'image_upload',
            label: 'Property photo (optional)',
            onUploadAction: 'upload_photo',
          });
          blocks.push({
            type: 'confirmation',
            title: 'Ready to Deploy',
            summary: {
              property: state.parsedData.property.name,
              address: state.parsedData.property.address,
              tenants: state.parsedData.tenants.length,
              arrearsInvoices: state.parsedData.tenants.filter(t => t.arrears > 0).length,
            },
            confirmAction: 'confirm_deploy',
            cancelAction: 'go_back',
          });
          break;
        }

        // ─── PHOTO UPLOAD ───
        case 'upload_photo': {
          if (!fileBuffer || !fileMimeType || !fileName) {
            blocks.push({ type: 'error', message: 'No photo received.' });
            break;
          }

          const photoResult = await this.tools.uploadPhoto(fileBuffer, fileMimeType, fileName, context);
          if (photoResult.success) {
            state.photoUrl = photoResult.data.photoUrl;
            blocks.push({ type: 'text', content: 'Photo uploaded. Ready to deploy when you are.' });
          } else {
            blocks.push({ type: 'text', content: 'Photo upload failed, but you can still deploy without it.' });
          }

          if (state.parsedData) {
            blocks.push({
              type: 'confirmation',
              title: 'Deploy Property',
              summary: {
                property: state.parsedData.property.name,
                tenants: state.parsedData.tenants.length,
                photoAttached: !!state.photoUrl,
              },
              confirmAction: 'confirm_deploy',
            });
          }
          break;
        }

        // ─── CONFIRM & DEPLOY ───
        case 'confirm_deploy': {
          if (!state.parsedData) {
            blocks.push({ type: 'error', message: 'No data to deploy. Please start over.' });
            state.step = 'idle';
            break;
          }

          pushHistory();
          state.step = 'deploying';

          const arrearsCount = state.parsedData.tenants.filter(t => t.arrears > 0).length;

          blocks.push({
            type: 'step_guide',
            steps: [
              { title: 'Creating property record', status: 'running' },
              { title: `Registering ${state.parsedData.tenants.length} tenants`, status: 'pending' },
              { title: arrearsCount > 0 ? `Generating ${arrearsCount} arrears invoices` : 'Checking invoices', status: 'pending' },
              { title: 'Finalizing', status: 'pending' },
            ],
          });

          // Execute the deploy
          const deployResult = await this.tools.createProperty(
            state.parsedData,
            state.photoUrl,
            context,
          );

          if (deployResult.success) {
            state.step = 'complete';
            blocks.length = 0; // Clear the pending step guide
            blocks.push({
              type: 'step_guide',
              steps: [
                { title: 'Property record created', status: 'done' },
                { title: `${deployResult.data.tenantsCreated} tenants registered`, status: 'done' },
                { title: deployResult.data.invoicesCreated > 0 ? `${deployResult.data.invoicesCreated} arrears invoices generated` : 'No arrears invoices needed', status: 'done' },
                { title: 'Deployed successfully', status: 'done' },
              ],
            });
            blocks.push({
              type: 'text',
              content: `**"${state.parsedData.property.name}"** is now [green]live[/green]! Registered [green]${deployResult.data.tenantsCreated} tenants[/green] and drafted [green]${deployResult.data.invoicesCreated} arrears invoices[/green]. Check the **Properties** tab to see it.`,
            });
          } else {
            state.step = 'awaiting_confirmation';
            blocks.length = 0;
            blocks.push({
              type: 'error',
              message: `Deploy failed: ${deployResult.error}`,
              suggestion: 'Check the data and try again, or contact support.',
            });
            blocks.push({
              type: 'confirmation',
              title: 'Retry Deploy',
              summary: { property: state.parsedData.property.name },
              confirmAction: 'confirm_deploy',
              cancelAction: 'go_back',
            });
          }
          break;
        }

        // ─── GO BACK ───
        case 'go_back': {
          if (state.history && state.history.length > 0) {
            state.step = state.history.pop();
          } else {
            state.step = 'idle';
            state.parsedData = undefined;
            state.photoUrl = undefined;
            state.fileUrl = undefined;
          }
          blocks.push({ type: 'text', content: 'Went back. What would you like to do?' });

          if (state.step === 'awaiting_file') {
            blocks.push({
              type: 'file_upload',
              accept: '.xlsx,.xls,.csv,.pdf,image/*',
              label: 'Upload tenant file',
              onUploadAction: 'upload_file',
            });
          }
          break;
        }

        // ─── EDIT DATA ───
        case 'edit_data': {
          const parsedData = state.parsedData;
          if (!parsedData || !message) {
            blocks.push({ type: 'error', message: 'No data to edit or no instruction given.' });
            break;
          }

          const editResult = await this.tools.editDataWithAI(parsedData, message, context);
          if (editResult.success) {
            state.parsedData = editResult.data;
            const updatedData = editResult.data as ParsedPropertyData;
            blocks.push({ type: 'text', content: 'Updated. Here\'s the revised data:' });
            blocks.push({
              type: 'data_table',
              title: `${updatedData.property.name}`,
              columns: [
                { key: 'unit', label: 'Unit' },
                { key: 'name', label: 'Tenant' },
                { key: 'email', label: 'Email' },
                { key: 'rent', label: 'Rent' },
                { key: 'arrears', label: 'Arrears' },
              ],
              rows: updatedData.tenants,
              editable: false,
            });
            blocks.push({
              type: 'confirmation',
              title: 'Deploy with Changes',
              summary: {
                property: updatedData.property.name,
                tenants: updatedData.tenants.length,
              },
              confirmAction: 'confirm_deploy',
            });
          } else {
            blocks.push({ type: 'error', message: `Edit failed: ${editResult.error}` });
          }
          break;
        }

        default:
          blocks.push({ type: 'text', content: 'Not sure what you mean. Try telling me what you need.' });
      }
    } catch (err: any) {
      console.error('Agent orchestrator error:', err);
      blocks.push({
        type: 'error',
        message: `Something went wrong: ${err.message}`,
        suggestion: 'Try again or describe what you need differently.',
      });
    }

    return { blocks, conversationState: state };
  }

  // ─── TENANT AGENT ORCHESTRATION ───

  async buildTenantContext(tenantId: string): Promise<AgentContext> {
    const userRows = await this.db.sql`
      SELECT name, email
      FROM users
      WHERE id = ${parseInt(tenantId) || 0} OR CAST(id AS VARCHAR) = ${tenantId}
      LIMIT 1
    `;
    const email = userRows[0]?.email || '';
    const name = userRows[0]?.name || 'Tenant';

    const contactRows = await this.db.sql`
      SELECT property_name, unit, arrears, landlord_id
      FROM tenant_contacts
      WHERE email = ${email}
      LIMIT 1
    `;
    const landlordId = contactRows[0]?.landlord_id || 'system';

    return {
      landlordId,
      landlordName: '',
      landlordEmail: '',
      tier: 'free',
      propertiesCount: 1,
      tenantsCount: 1,
      role: 'tenant',
      tenantId,
      tenantName: name,
      tenantEmail: email,
    };
  }

  async runTenant(
    action: string,
    tenantId: string,
    message?: string,
    conversationState?: ConversationState,
    chatHistory?: any[],
    onChunk?: (data: { blocks: any[]; conversationState: any }) => void,
  ): Promise<AgentRunResponse> {
    const context = await this.buildTenantContext(tenantId);
    return this.sophia.run(message || '', context, conversationState || { step: 'idle', history: [] }, chatHistory, onChunk);
  }
}
