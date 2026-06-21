import { Controller, Get, Post, Body, Headers, UnauthorizedException, Param, Query } from '@nestjs/common';
import { TicketsService, Ticket } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  private getUserId(authHeader?: string): string {
    if (!authHeader) throw new UnauthorizedException('Missing token');
    return authHeader.replace('Bearer ', '');
  }

  @Get('tenant')
  async getTenantTickets(@Headers('Authorization') authHeader?: string): Promise<Ticket[]> {
    const tenantId = this.getUserId(authHeader);
    return this.ticketsService.findAllByTenant(tenantId);
  }

  @Post()
  async createTicket(
    @Body() body: { description: string; urgency: 'low' | 'medium' | 'high'; propertyId?: string; tenantId?: string },
    @Headers('Authorization') authHeader?: string,
  ): Promise<Ticket> {
    const tenantId = body.tenantId || this.getUserId(authHeader);
    return this.ticketsService.create({
      description: body.description,
      urgency: body.urgency,
      propertyId: body.propertyId,
      tenantId,
    });
  }

  @Post(':id/assign')
  async assignContractor(
    @Param('id') id: string,
    @Body() body: { contractorId: string },
  ): Promise<Ticket> {
    const updated = await this.ticketsService.assignContractor(id, body.contractorId);
    if (!updated) throw new UnauthorizedException('Ticket not found');
    return updated;
  }

  @Get()
  async getAllTickets(): Promise<Ticket[]> {
    return this.ticketsService.findAll();
  }

  @Post(':id/complete')
  async completeTicket(
    @Param('id') id: string,
    @Body() body?: { rating?: number; ratingComment?: string }
  ): Promise<Ticket> {
    const updated = await this.ticketsService.completeTicketWithRating(id, body?.rating, body?.ratingComment);
    if (!updated) throw new UnauthorizedException('Ticket not found');
    return updated;
  }

  @Post(':id/hold')
  async holdTicket(@Param('id') id: string): Promise<Ticket> {
    const updated = await this.ticketsService.updateStatus(id, 'on_hold');
    if (!updated) throw new UnauthorizedException('Ticket not found');
    return updated;
  }

  @Get('contractors')
  async getContractors(): Promise<any[]> {
    return this.ticketsService.findContractors();
  }

  @Post('contractors')
  async addContractor(@Body() body: { name: string; email: string; specialty: string; phone?: string }): Promise<any> {
    return this.ticketsService.addContractor(body.name, body.email, body.specialty, body.phone);
  }

  @Get('contractor/:contractorId')
  async getContractorTickets(@Param('contractorId') contractorId: string): Promise<Ticket[]> {
    return this.ticketsService.findAllByContractor(parseInt(contractorId) || 0);
  }

  @Get('contractor-profile')
  async getContractorProfile(@Query('email') email: string): Promise<any> {
    const profile = await this.ticketsService.findContractorByEmail(email);
    if (!profile) {
      // Auto-create base profile if email doesn't have one
      return this.ticketsService.addContractor(email.split('@')[0], email, 'Plumbing & Heating');
    }
    return profile;
  }

  @Post('contractor-profile')
  async updateContractorProfile(
    @Body() body: { email: string; name?: string; specialty?: string; phone?: string; bio?: string; hourlyRate?: number; photoUrl?: string; latitude?: string; longitude?: string; locationName?: string; status?: string; onboarded?: boolean }
  ): Promise<any> {
    return this.ticketsService.updateContractorProfile(body.email, body);
  }

  @Post(':id/hire')
  async hireContractor(
    @Param('id') id: string,
    @Body() body: { contractorId: number; amount: number }
  ): Promise<Ticket> {
    const updated = await this.ticketsService.hireContractor(id, body.contractorId, body.amount);
    if (!updated) throw new UnauthorizedException('Ticket not found');
    return updated;
  }

  @Post(':id/accept-offer')
  async acceptOffer(@Param('id') id: string): Promise<Ticket> {
    const updated = await this.ticketsService.acceptHireOffer(id);
    if (!updated) throw new UnauthorizedException('Ticket not found');
    return updated;
  }

  @Post('contractors/upload-r2')
  async uploadToR2(@Body() body: { fileName: string }): Promise<any> {
    return {
      url: `https://pub-r2.nexis.io/contractors/${Math.random().toString(36).substring(7)}-${body.fileName}`
    };
  }
}
