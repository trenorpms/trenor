import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  Headers,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AgentService } from './agent.service';
import { SophiaToolsService } from './sophia-tools.service';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly toolsService: SophiaToolsService,
  ) {}

  @Post('run')
  @UseInterceptors(FileInterceptor('file'))
  async run(
    @Body() body: any,
    @UploadedFile() file: any | undefined,
    @Headers('authorization') authHeader: string,
    @Res() res: express.Response,
  ) {
    // Parse landlord identity from auth header (Bearer <userId>)
    const landlordId = authHeader?.replace('Bearer ', '')?.trim();
    if (!landlordId) {
      res.status(401).json({ blocks: [{ type: 'error', message: 'Not authenticated.' }], conversationState: {} });
      return;
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    // Track connection state — avoid writing to dead sockets
    let connectionAlive = true;
    res.on('close', () => { connectionAlive = false; });

    const safeWrite = (data: any) => {
      if (!connectionAlive) return;
      try { res.write(JSON.stringify(data) + '\n'); } catch {}
    };

    // Immediate heartbeat so the connection stays alive during retries
    safeWrite({ status: 'thinking' });

    // Parse body fields — may come as stringified JSON from FormData
    let action = body.action || 'chat';
    let message = body.message;
    let formData: Record<string, string> | undefined;
    let conversationState: any;
    let chatHistory: any[] | undefined;

    try {
      if (typeof body.formData === 'string') formData = JSON.parse(body.formData);
      else formData = body.formData;
    } catch { formData = undefined; }

    try {
      if (typeof body.conversationState === 'string') conversationState = JSON.parse(body.conversationState);
      else conversationState = body.conversationState;
    } catch { conversationState = undefined; }

    try {
      if (typeof body.chatHistory === 'string') chatHistory = JSON.parse(body.chatHistory);
      else chatHistory = body.chatHistory;
    } catch { chatHistory = undefined; }

    // Build context
    const landlordName = body.landlordName || 'Landlord';
    const landlordEmail = body.landlordEmail || '';
    const context = await this.agentService.buildContext(landlordId, landlordName, landlordEmail);

    const onChunk = (data: { blocks: any[]; conversationState: any }) => {
      safeWrite(data);
    };

    try {
      // Run orchestrator
      const result = await this.agentService.run(
        action,
        context,
        message,
        file?.buffer,
        file?.mimetype,
        file?.originalname,
        formData,
        conversationState,
        chatHistory,
        onChunk,
      );
      safeWrite(result);
    } catch (err: any) {
      safeWrite({ blocks: [{ type: 'error', message: `Execution failed: ${err.message}` }], conversationState: {} });
    } finally {
      if (connectionAlive) try { res.end(); } catch {}
    }
  }

  @Post('run-tenant')
  async runTenant(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Res() res: express.Response,
  ) {
    const tenantId = authHeader?.replace('Bearer ', '')?.trim();
    if (!tenantId) {
      res.status(401).json({ blocks: [{ type: 'error', message: 'Not authenticated.' }], conversationState: {} });
      return;
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    // Track connection state
    let connectionAlive = true;
    res.on('close', () => { connectionAlive = false; });

    const safeWrite = (data: any) => {
      if (!connectionAlive) return;
      try { res.write(JSON.stringify(data) + '\n'); } catch {}
    };

    // Immediate heartbeat
    safeWrite({ status: 'thinking' });

    let action = body.action || 'chat';
    let message = body.message;
    let conversationState: any;
    let chatHistory: any[] | undefined;

    try {
      if (typeof body.conversationState === 'string') conversationState = JSON.parse(body.conversationState);
      else conversationState = body.conversationState;
    } catch { conversationState = undefined; }

    try {
      if (typeof body.chatHistory === 'string') chatHistory = JSON.parse(body.chatHistory);
      else chatHistory = body.chatHistory;
    } catch { chatHistory = undefined; }

    const onChunk = (data: { blocks: any[]; conversationState: any }) => {
      safeWrite(data);
    };

    try {
      const result = await this.agentService.runTenant(
        action,
        tenantId,
        message,
        conversationState,
        chatHistory,
        onChunk,
      );
      safeWrite(result);
    } catch (err: any) {
      safeWrite({ blocks: [{ type: 'error', message: `Execution failed: ${err.message}` }], conversationState: {} });
    } finally {
      if (connectionAlive) try { res.end(); } catch {}
    }
  }

  @Get('tools')
  async getTools(@Headers('authorization') authHeader: string) {
    const landlordId = authHeader?.replace('Bearer ', '')?.trim();
    if (!landlordId) return [];
    return this.toolsService.getToolConfig(landlordId);
  }

  @Patch('tools/:name')
  async updateTool(
    @Param('name') name: string,
    @Body() body: { enabled: boolean; requiresApproval: boolean },
    @Headers('authorization') authHeader: string
  ) {
    const landlordId = authHeader?.replace('Bearer ', '')?.trim();
    if (!landlordId) return { success: false, error: 'Not authenticated' };
    return this.toolsService.setToolConfig(landlordId, name, body.enabled, body.requiresApproval);
  }

  @Get('activity')
  async getActivity(@Headers('authorization') authHeader: string) {
    const landlordId = authHeader?.replace('Bearer ', '')?.trim();
    if (!landlordId) return [];
    const res = await this.toolsService.executeTool('get_agent_activity', { limit: 50 }, { landlordId, landlordName: 'System', landlordEmail: '', tier: 'partner', propertiesCount: 0, tenantsCount: 0 });
    return res.success ? res.data : [];
  }
}
