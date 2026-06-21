import { Injectable } from '@nestjs/common';
import { SophiaToolsService } from './sophia-tools.service';
import { PropertiesService } from '../properties/properties.service';
import { TOOL_REGISTRY, toGeminiFunctionDeclarations } from './tool-registry';
import { AgentContext, AgentResponseBlock, AgentRunResponse, ConversationState } from './agent.types';

@Injectable()
export class SophiaOrchestratorService {
  constructor(
    private readonly tools: SophiaToolsService,
    private readonly properties: PropertiesService,
  ) {}

  async buildContext(landlordId: string, landlordName: string, landlordEmail: string): Promise<AgentContext> {
    let propertiesCount = 0;
    let tenantsCount = 0;
    try {
      const props = await this.properties.findAll(landlordId);
      propertiesCount = props.length;
      const tenants = await this.properties.findTenants(landlordId);
      tenantsCount = tenants.length;
    } catch {}
    return { landlordId, landlordName, landlordEmail, tier: 'partner', propertiesCount, tenantsCount };
  }

  // ─── MAIN ORCHESTRATOR: Gemini Function-Calling Loop ───
  async run(
    message: string,
    context: AgentContext,
    conversationState?: ConversationState,
    chatHistory?: any[],
  ): Promise<AgentRunResponse> {
    const state: ConversationState = conversationState || { step: 'idle', history: [] };
    const blocks: AgentResponseBlock[] = [];
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      blocks.push({ type: 'error', message: 'Gemini API key not configured.', suggestion: 'Add GEMINI_API_KEY to your backend .env' });
      return { blocks, conversationState: state };
    }

    // Get tool config overrides for this landlord
    let enabledTools = [...TOOL_REGISTRY];
    if (context.role === 'tenant') {
      enabledTools = enabledTools.filter(t => t.name.startsWith('tenant_'));
    } else {
      enabledTools = enabledTools.filter(t => !t.name.startsWith('tenant_'));
      try {
        const config = await this.tools.getToolConfig(context.landlordId);
        if (config && config.length > 0) {
          const configMap = new Map<string, any>(config.map((c: any) => [c.toolName, c]));
          enabledTools = enabledTools.map(t => {
            const override = configMap.get(t.name);
            if (override) return { ...t, enabled: override.enabled, requiresConfirmation: override.requiresApproval };
            return t;
          });
        }
      } catch {}
    }

    const functionDeclarations = toGeminiFunctionDeclarations(enabledTools);

    // Read memories/preferences
    let memoriesText = '';
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, 'memories', `${context.landlordId}.json`);
      if (fs.existsSync(filePath)) {
        const memories = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const entries = Object.entries(memories);
        if (entries.length > 0) {
          memoriesText = '\nThings you have learned about this user (preferences, nicknames, etc.) that you must remember:\n' +
            entries.map(([key, val]) => `- ${key}: ${val}`).join('\n');
        }
      }
    } catch {}

    let systemPrompt = '';
    if (context.role === 'tenant') {
      systemPrompt = `You are Sophia, the AI assistant for Trenor property management platform.
You are speaking with the tenant ${context.tenantName} (${context.tenantEmail}).
Keep responses concise, helpful, and direct. No jargon or marketing fluff. Only use clean, human-centric language.
- Only call tools when the user's message explicitly requests or requires information or actions that require a tool. Do NOT call tools for general chit-chat, greetings, or casual conversation.
- When you do call a tool, you MUST include a brief, conversational text explanation BEFORE the function call explaining what you are about to do (e.g., "Let me check your billing history..." or "I will log that maintenance request for you...").
- When presenting data from tools, format it clearly with key details.
- Always tell the user what you found or did, referencing specific names and numbers.
- You are encouraged to use formatting to make your responses clean and beautiful:
  • **bold** for key terms, amounts, or names.
  • *italics* for notes or minor details.
  • Color tags to highlight statuses and items: [coral]Text[/coral] for coral highlight, [green]Text[/green] for success/paid, [blue]Text[/blue] for general info, [gold]Text[/gold] for warning/urgency, [gray]Text[/gray] for secondary info.`;
    } else {
      systemPrompt = `You are Sophia, the AI assistant for Trenor property management platform.
You are speaking with ${context.landlordName} (${context.landlordEmail}).
They manage ${context.propertiesCount} properties and ${context.tenantsCount} tenants.
${memoriesText}

RULES:
- Be concise, helpful, and direct. No jargon or marketing fluff. Only use clean, human-centric language.
- Only call tools when the user's message explicitly requests or requires information or actions that require a tool. Do NOT call tools for general chit-chat, greetings, or casual conversation.
- When you do call a tool, you MUST include a brief, conversational text explanation BEFORE the function call explaining what you are about to do (e.g., "Let me look up your properties list..." or "Checking the invoices now...").
- When asked to do something, USE the tools — don't just describe what you would do.
- For read operations (list, get, analytics), call the tool immediately.
- For write operations (create, invite, assign, reconcile), call the tool and confirm the result.
- When presenting data from tools, format it clearly with key details.
- If you need multiple tools, call them one at a time in logical order.
- Always tell the user what you found or did, referencing specific names and numbers.
- You are encouraged to use formatting to make your responses clean and beautiful:
  • **bold** for key terms, amounts, or names.
  • *italics* for notes or minor details.
  • Color tags to highlight statuses and items: [coral]Text[/coral] for coral highlight, [green]Text[/green] for success/paid, [blue]Text[/blue] for general info, [gold]Text[/gold] for warning/urgency, [gray]Text[/gray] for secondary info.`;
    }

    // Build conversation history for Gemini
    const contents: any[] = [];
    if (chatHistory && chatHistory.length > 0) {
      for (const msg of chatHistory) {
        if (msg.role === 'user') {
          if (msg.content) {
            contents.push({ role: 'user', parts: [{ text: msg.content }] });
          }
        } else if (msg.role === 'agent') {
          const textContent = msg.content || msg.blocks?.filter((b: any) => b.type === 'text').map((b: any) => b.content).join('\n') || '';
          if (textContent) {
            contents.push({ role: 'model', parts: [{ text: textContent }] });
          }
        }
      }
    }

    // Always ensure the latest message is appended
    const lastUserContent = contents[contents.length - 1]?.parts?.[0]?.text;
    if (lastUserContent !== message) {
      contents.push({ role: 'user', parts: [{ text: message }] });
    }

    try {
      // ─── FUNCTION-CALLING LOOP (max 6 iterations) ───
      let iterations = 0;
      const maxIterations = 6;
      const toolResults: Array<{ tool: string; result: any }> = [];

      while (iterations < maxIterations) {
        iterations++;

        // Normalize contents for thoughtSignature / thought_signature
        const normalizedContents = contents.map(turn => {
          if (!turn || !turn.parts) return turn;
          const turnParts = turn.parts.map((part: any) => {
            if (!part) return part;
            const newPart = { ...part };
            const sig = part.thoughtSignature || part.thought_signature;
            if (sig) {
              newPart.thoughtSignature = sig;
              newPart.thought_signature = sig;
            }
            return newPart;
          });
          return { ...turn, role: turn.role === 'agent' ? 'model' : turn.role, parts: turnParts };
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: normalizedContents,
            tools: [{ function_declarations: functionDeclarations }],
            tool_config: { function_calling_config: { mode: 'AUTO' } },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          blocks.push({ type: 'error', message: `AI service error (${response.status})`, suggestion: errText.substring(0, 200) });
          break;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (!candidate) {
          blocks.push({ type: 'error', message: 'No response from AI.', suggestion: 'Try rephrasing your request.' });
          break;
        }

        const parts = candidate.content?.parts || [];

        // Check if Gemini wants to call a function
        const functionCallPart = parts.find((p: any) => p.functionCall);

        if (functionCallPart) {
          // If Gemini generated text before calling the function, show it
          const textPart = parts.find((p: any) => p.text);
          if (textPart && textPart.text?.trim()) {
            blocks.push({ type: 'text', content: textPart.text });
          }

          const fn = functionCallPart.functionCall;
          const toolName = fn.name;
          const toolArgs = fn.args || {};
          const callId = fn.id;

          // Execute the tool
          const toolResult = await this.tools.executeTool(toolName, toolArgs, context);
          toolResults.push({ tool: toolName, result: toolResult });

          // Feed the result back to Gemini for the next iteration
          contents.push(candidate.content);
          contents.push({
            role: 'function',
            parts: [{
              functionResponse: {
                name: toolName,
                response: {
                  success: toolResult.success,
                  data: toolResult.data,
                  error: toolResult.error,
                },
                ...(callId ? { id: callId } : {}),
              },
            }],
          });

          // Continue the loop — Gemini may call another tool or produce text
          continue;
        }

        // No function call — Gemini produced a text response. We're done.
        const textPart = parts.find((p: any) => p.text);
        if (textPart) {
          blocks.push({ type: 'text', content: textPart.text });
        }

        // If we called tools, add inline tool cards
        if (toolResults.length > 0) {
          const toolSummaryRows = toolResults.map(tr => ({
            task: getHumanActionName(tr.tool),
            status: tr.result.success ? '✓' : '✗',
            detail: tr.result.log || '',
          }));
          blocks.push({
            type: 'data_table',
            title: 'Actions taken',
            columns: [
              { key: 'task', label: 'Task' },
              { key: 'status', label: '' },
              { key: 'detail', label: 'Result' },
            ],
            rows: toolSummaryRows,
            editable: false,
          });
        }

        break; // Done
      }

      if (iterations >= maxIterations && blocks.length === 0) {
        blocks.push({ type: 'text', content: 'I completed the maximum number of steps. Here\'s what I did:' });
        for (const tr of toolResults) {
          blocks.push({ type: 'text', content: `• **${tr.tool}**: ${tr.result.log}` });
        }
      }

    } catch (err: any) {
      console.error('Sophia orchestrator error:', err);
      blocks.push({ type: 'error', message: `Something went wrong: ${err.message}`, suggestion: 'Try again or rephrase your request.' });
    }

    return { blocks, conversationState: state };
  }
}

function getHumanActionName(toolName: string): string {
  const mapping: Record<string, string> = {
    tenant_create_maintenance_request: 'Opening maintenance request',
    tenant_get_arrears: 'Checking balance due',
    tenant_list_invoices: 'Checking billing history',
    tenant_get_maintenance_status: 'Checking maintenance request status',
    tenant_get_last_payment: 'Checking payment history',
    tenant_get_summary: 'Generating tenancy summary',
    create_maintenance_request: 'Opening maintenance request',
    list_properties: 'Checking property list',
    get_property_detail: 'Retrieving property details',
    create_property: 'Adding new property',
    list_tenants: 'Checking tenant list',
    invite_tenant: 'Sending tenant invitation',
    find_vacant_units: 'Finding vacant units',
    list_invoices: 'Checking invoices',
    create_invoice: 'Creating invoice',
    reconcile_invoice: 'Updating invoice payment status',
    list_tickets: 'Checking maintenance requests',
    list_contractors: 'Checking contractor availability',
    assign_contractor: 'Assigning contractor',
    smart_assign_contractor: 'Matching best contractor',
    get_analytics: 'Retrieving financial overview',
    get_audit_log: 'Checking activity log',
    get_agent_activity: 'Checking assistant logs',
    send_tenant_message: 'Sending message to tenant',
    remove_tenant: 'Removing tenant',
    delete_property: 'Deleting property',
    save_memory_or_preference: 'Saving preferences',
  };
  return mapping[toolName] || toolName;
}
