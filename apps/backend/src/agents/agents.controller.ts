import { Controller, Get, Post, Body, Headers, UnauthorizedException, Param, Query } from '@nestjs/common';
import { AgentsService, AgentActivity, AgentConfig } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  private getLandlordId(authHeader?: string): string {
    if (!authHeader) throw new UnauthorizedException('Missing token');
    return authHeader.replace('Bearer ', '');
  }

  @Get('config')
  getConfig(@Headers('Authorization') authHeader?: string): AgentConfig {
    const landlordId = this.getLandlordId(authHeader);
    return this.agentsService.getConfig(landlordId);
  }

  @Post('config')
  updateConfig(
    @Body() body: { tier: 'free' | 'pro' | 'partner'; autoApproveLimit: number },
    @Headers('Authorization') authHeader?: string,
  ): AgentConfig {
    const landlordId = this.getLandlordId(authHeader);
    return this.agentsService.updateConfig(landlordId, body.tier, body.autoApproveLimit);
  }

  @Get('activity')
  getActivity(@Query('ticketId') ticketId: string): AgentActivity[] {
    return this.agentsService.getActivities(ticketId);
  }

  @Post('activity')
  logActivity(
    @Body() body: { ticketId: string; status: AgentActivity['status']; actionDescription: string },
  ): AgentActivity {
    return this.agentsService.logActivity(body.ticketId, body.status, body.actionDescription);
  }
}
