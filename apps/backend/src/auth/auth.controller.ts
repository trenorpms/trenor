import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('signup')
  async signup(@Body() body: any) {
    return this.authService.signup(body.email, body.password, body.name, body.role);
  }

  @Post('validate-session')
  @HttpCode(HttpStatus.OK)
  async validateSession(@Body() body: any) {
    return this.authService.validateUser(body.email, body.id);
  }

  @Post('invite')
  async inviteManager(@Body() body: any) {
    return this.authService.inviteManager(body.email, body.landlordId, body.landlordName);
  }

  @Post('validate-invite')
  @HttpCode(HttpStatus.OK)
  async validateInvite(@Body() body: any) {
    return this.authService.validateInvite(body.token);
  }

  @Post('accept-invite')
  async acceptInvite(@Body() body: any) {
    return this.authService.acceptInvite(body.token, body.name, body.password);
  }

  @Post('team')
  @HttpCode(HttpStatus.OK)
  async getTeam(@Body() body: any) {
    return this.authService.getTeam(body.landlordId);
  }

  @Post('connections')
  @HttpCode(HttpStatus.OK)
  async getConnections(@Body() body: { userId: string; role: string }) {
    return this.authService.getConnections(body.userId, body.role);
  }

  @Post('invite/generate')
  @HttpCode(HttpStatus.OK)
  async generateInvite(
    @Body() body: { landlordId: string; targetRole: 'tenant' | 'landlord'; propertyId?: string; unit?: string; createdById: string; email?: string }
  ) {
    return this.authService.generateLinkCode(body);
  }

  @Post('invite/preview')
  @HttpCode(HttpStatus.OK)
  async previewInvite(@Body() body: { code: string }) {
    return this.authService.previewLinkCode(body.code);
  }

  @Post('invite/claim')
  @HttpCode(HttpStatus.OK)
  async claimInvite(@Body() body: { code: string; userId: string }) {
    return this.authService.claimLinkCode(body.code, body.userId);
  }

  @Post('update-role')
  @HttpCode(HttpStatus.OK)
  async updateRole(@Body() body: { userId: string; role: string }) {
    return this.authService.updateRole(body.userId, body.role);
  }
}
