import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  private readonly apiKey = process.env.RESEND_API_KEY || 're_JauBr8A4_38AzZgLibMsSYgKN8JgmDMYj';
  private readonly fromEmail = 'Trenor Transactional <onboarding@resend.dev>';

  private async sendEmail(to: string, subject: string, htmlContent: string) {
    try {
      this.logger.log(`Sending transactional email to ${to}: "${subject}"`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject: subject,
          html: htmlContent,
          tags: [
            { name: 'category', value: 'transactional' }
          ]
        }),
      });

      const resBody = await response.json();
      if (!response.ok) {
        this.logger.error(`Resend API failed: ${JSON.stringify(resBody)}`);
        return false;
      }
      this.logger.log(`Email sent successfully. ID: ${resBody.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      return false;
    }
  }

  async sendLoginNotification(email: string, name: string, ip: string = 'Unknown') {
    const time = new Date().toLocaleString();
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #ff6b6b; margin-top: 0;">New Account Login detected</h2>
        <p>Hello ${name},</p>
        <p>We detected a new login to your Trenor account on <strong>${time}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;"><strong>IP Address:</strong> ${ip}</p>
        </div>
        <p style="font-size: 13px; color: #6b7280;">If this was you, no action is needed. If you did not authorize this login, please contact security immediately.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">Trenor Rental Systems &bull; Transactional Dispatch</p>
      </div>
    `;
    return this.sendEmail(email, 'Trenor | Security Alert: New Login Detected', html);
  }

  async sendSignupConfirmation(email: string, name: string, role: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #ff6b6b; margin-top: 0;">Welcome to Trenor!</h2>
        <p>Hello ${name},</p>
        <p>Your account has been successfully created. We are excited to have you join our autonomous rental operations.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Account Type:</strong> ${role.toUpperCase()}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Registered Email:</strong> ${email}</p>
        </div>
        <p>You can now log in to the portal and start setting up your properties or reviewing rent ledger states.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">Trenor Rental Systems &bull; Transactional Dispatch</p>
      </div>
    `;
    return this.sendEmail(email, 'Welcome to Trenor - Registration Confirmed', html);
  }

  async sendCriticalNotification(email: string, subject: string, description: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #dc2626; margin-top: 0;">Critical Notification</h2>
        <p>${description}</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">Trenor Rental Systems &bull; Critical Operations</p>
      </div>
    `;
    return this.sendEmail(email, `Trenor | Critical: ${subject}`, html);
  }

  async sendManagerInvitation(email: string, landlordName: string, inviteLink: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #ff6b6b; margin-top: 0;">Property Manager Invitation</h2>
        <p>Hello,</p>
        <p>You have been invited by <strong>${landlordName}</strong> to become a Property Manager for their real estate portfolio on Trenor.</p>
        <p>As a property manager, you will be authorized to manually list new assets, review occupancy metrics, and manage properties on behalf of the landlord.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation & Setup Account</a>
        </div>
        <p style="font-size: 12px; color: #6b7280;">Note: This invitation link is critical and will expire in 24 hours.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">Trenor Rental Systems &bull; Team Operations</p>
      </div>
    `;
    return this.sendEmail(email, `Invitation to manage properties for ${landlordName}`, html);
  }
}
