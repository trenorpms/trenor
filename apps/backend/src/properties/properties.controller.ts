import { Controller, Get, Post, Body, Headers, UnauthorizedException, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PropertiesService, Property } from './properties.service';
import { OnboardingService } from '../onboarding/onboarding.service';

@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly onboardingService: OnboardingService,
  ) {}

  private async getLandlordId(authHeader?: string): Promise<string> {
    if (!authHeader) throw new UnauthorizedException('Missing token');
    const userId = authHeader.replace('Bearer ', '');
    return this.propertiesService.resolveLandlordId(userId);
  }

  @Get()
  async getProperties(@Headers('Authorization') authHeader?: string): Promise<Property[]> {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.findAll(landlordId);
  }

  @Post()
  async createProperty(
    @Body() body: { name: string; address: string; unitsCount: number },
    @Headers('Authorization') authHeader?: string,
  ): Promise<Property> {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.create({
      name: body.name,
      address: body.address,
      unitsCount: body.unitsCount,
      landlordId,
    });
  }

  @Post(':id/status')
  async updatePropertyStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.updateStatus(id, landlordId, body.status);
  }

  @Post(':id/edit')
  async editProperty(
    @Param('id') id: string,
    @Body() body: { name: string; address: string; unitsCount: number },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.edit(id, landlordId, body);
  }

  @Post('deploy')
  async deployProperty(
    @Body() body: {
      property: { name: string; location: string; type: string; unitsCount: number; status?: string };
      tenants: any[];
      invoices: any[];
    },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.deploy(landlordId, body);
  }
  @Post('tenants/:id/move')
  async moveTenant(
    @Param('id') id: string,
    @Body() body: { targetPropertyId: string; targetPropertyName: string; targetUnit: string; action?: 'archive' | 'interchange' },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.moveTenant(id, landlordId, body);
  }

  @Post('invoices')
  async createInvoice(
    @Body() body: { tenantEmail: string; tenantName: string; unitNumber: string; amountDue: number; propertyName: string; description: string },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    const creator = await this.propertiesService.getLandlordName(landlordId);
    return this.propertiesService.createSingleInvoice(landlordId, creator, body);
  }

  @Post('invoices/:id/reconcile')
  async reconcileInvoice(
    @Param('id') id: string,
    @Body() body: { amountPaid: number; description: string; receiptUrl?: string },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    const operatorName = await this.propertiesService.getLandlordName(landlordId);
    return this.propertiesService.reconcileInvoice(id, landlordId, { ...body, operatorName });
  }

  @Post('invoices/batch-reconcile')
  async batchReconcile(
    @Body() body: { invoiceIds: string[]; amountPaidMap?: Record<string, number>; description: string; receiptUrl?: string },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    const operatorName = await this.propertiesService.getLandlordName(landlordId);
    for (const invId of body.invoiceIds) {
      const amountPaid = body.amountPaidMap?.[invId] || await this.propertiesService.getInvoiceAmountDue(invId, landlordId);
      await this.propertiesService.reconcileInvoice(invId, landlordId, {
        amountPaid,
        description: body.description,
        receiptUrl: body.receiptUrl,
        operatorName
      });
    }
    return { success: true };
  }

  @Post('invoices/upload-receipt')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(
    @UploadedFile() file: any
  ) {
    if (!file) return { url: '' };
    const uploadResult = await this.onboardingService.uploadToR2(
      file.originalname,
      file.buffer,
      file.mimetype
    );
    return { url: uploadResult.publicUrl };
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('Authorization') authHeader?: string
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.findAuditLogs(landlordId, startDate, endDate);
  }

  @Get('expenses')
  async getExpenses(@Headers('Authorization') authHeader?: string) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.findExpenses(landlordId);
  }

  @Post('expenses')
  async createExpense(
    @Body() body: { description: string; amount: number; category: string; propertyId: string; propertyName: string },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.createExpense(landlordId, body);
  }

  @Get('tenants')
  async getTenants(@Headers('Authorization') authHeader?: string) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.findTenants(landlordId);
  }

  @Get(':id/vacant-units')
  async getVacantUnits(
    @Param('id') propertyId: string,
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    return this.propertiesService.findVacantUnits(propertyId, landlordId);
  }

  @Post(':id/tenants')
  async addTenant(
    @Param('id') id: string,
    @Body() body: {
      name: string;
      email: string;
      phone: string;
      unit: string;
      rent: string;
      inviteMode: boolean;
      securityDeposit?: number;
      utilityFee?: number;
      isNewUnit?: boolean;
    },
    @Headers('Authorization') authHeader?: string,
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    const creator = await this.propertiesService.getLandlordName(landlordId);
    return this.propertiesService.addTenant(landlordId, creator, id, body);
  }

  @Get('invoices')
  async getInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('Authorization') authHeader?: string
  ) {
    const landlordId = await this.getLandlordId(authHeader);
    const p = page ? parseInt(page) : undefined;
    const l = limit ? parseInt(limit) : undefined;
    return this.propertiesService.findInvoices(landlordId, p, l);
  }

  @Get('tenant/invoices')
  async getTenantInvoices(@Headers('Authorization') authHeader?: string) {
    const email = authHeader ? authHeader.replace('Bearer ', '') : '';
    let tenantEmail = email;
    if (email && !email.includes('@')) {
      const userObj = await this.propertiesService.getUserEmail(email);
      if (userObj) tenantEmail = userObj.email;
    }
    return this.propertiesService.findTenantInvoices(tenantEmail);
  }

  @Get('tenant/profile')
  async getTenantProfile(@Headers('Authorization') authHeader?: string) {
    const identifier = authHeader ? authHeader.replace('Bearer ', '') : '';
    let tenantEmail = identifier;
    if (identifier && !identifier.includes('@')) {
      const userObj = await this.propertiesService.getUserEmail(identifier);
      if (userObj) tenantEmail = userObj.email;
    }
    return this.propertiesService.findTenantDetails(tenantEmail);
  }

  @Post('tenant/pay-invoice')
  async payInvoice(
    @Body() body: { invoiceId: string; successUrl: string; cancelUrl: string }
  ) {
    return this.propertiesService.createInvoiceCheckoutSession(
      body.invoiceId,
      body.successUrl,
      body.cancelUrl
    );
  }

  @Post('tenant/verify-invoice-payment')
  async verifyInvoicePayment(
    @Body() body: { session_id: string }
  ) {
    return this.propertiesService.verifyStripeSession(body.session_id);
  }
}
