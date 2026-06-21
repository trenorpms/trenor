import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { CommunicationService } from '../communication/communication.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly communicationService: CommunicationService
  ) {}

  async login(email: string, password: string) {
    const users = await this.db.sql`
      SELECT id, email, name, role, password 
      FROM users 
      WHERE email = ${email}
    `;

    if (!users || users.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = users[0];
    if (user.password !== password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Send login notification asynchronously
    this.communicationService.sendLoginNotification(user.email, user.name).catch(err => {
      console.error('Failed to send login notification:', err);
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async signup(email: string, password: string, name: string, role: string) {
    // Check if user exists
    const existing = await this.db.sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existing && existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Insert user
    const result = await this.db.sql`
      INSERT INTO users (email, password, name, role)
      VALUES (${email}, ${password}, ${name}, ${role})
      RETURNING id, email, name, role
    `;

    if (!result || result.length === 0) {
      throw new ConflictException('Failed to create user');
    }

    const newUser = result[0];

    // Link contact to this new user account
    if (role === 'tenant') {
      await this.db.sql`
        UPDATE tenant_contacts
        SET user_id = ${newUser.id}
        WHERE email = ${email}
      `;
    }

    // Send signup confirmation asynchronously
    this.communicationService.sendSignupConfirmation(newUser.email, newUser.name, newUser.role).catch(err => {
      console.error('Failed to send signup confirmation:', err);
    });

    return newUser;
  }

  async validateUser(email: string, id: string) {
    const users = await this.db.sql`
      SELECT id, email, name, role 
      FROM users 
      WHERE email = ${email} AND id = ${id}
    `;

    if (!users || users.length === 0) {
      throw new UnauthorizedException('Session invalid or user deleted');
    }

    return users[0];
  }

  async inviteManager(email: string, landlordId: string, landlordName: string) {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.db.sql`
      INSERT INTO invitations (id, landlord_id, email, expires_at, used)
      VALUES (${token}, ${landlordId}, ${email}, ${expiresAt}, FALSE)
    `;

    const inviteLink = `http://localhost:3002/accept-invite?token=${token}`;
    
    // Send email asynchronously
    this.communicationService.sendManagerInvitation(email, landlordName, inviteLink).catch(err => {
      console.error('Failed to send manager invitation email:', err);
    });

    return { success: true, token };
  }

  async validateInvite(token: string) {
    const invites = await this.db.sql`
      SELECT id, landlord_id, email, expires_at, used
      FROM invitations
      WHERE id = ${token}
    `;

    if (!invites || invites.length === 0) {
      throw new BadRequestException('Invitation code invalid or not found');
    }

    const invite = invites[0];
    if (invite.used) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new BadRequestException('Invitation code has expired');
    }

    let landlordName = 'Portfolio Owner';
    const landlordIdStr = invite.landlord_id.toString();
    if (landlordIdStr === 'demo-landlord-id') {
      landlordName = 'Sarah Jenkins';
    } else {
      const landlords = await this.db.sql`
        SELECT name FROM users WHERE id = ${parseInt(landlordIdStr) || 0} OR CAST(id AS VARCHAR) = ${landlordIdStr}
      `;
      if (landlords && landlords.length > 0) {
        landlordName = landlords[0].name;
      }
    }

    return {
      valid: true,
      email: invite.email,
      landlordId: invite.landlord_id,
      landlordName
    };
  }

  async acceptInvite(token: string, name: string, password: string) {
    const validation = await this.validateInvite(token);

    // Check if user already registered this email
    const existingUsers = await this.db.sql`
      SELECT id, email, name, role FROM users WHERE email = ${validation.email}
    `;

    let user;
    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
      // Update role if not manager
      await this.db.sql`
        UPDATE users SET role = 'manager' WHERE id = ${user.id}
      `;
      user.role = 'manager';
    } else {
      // Insert user as property manager
      const result = await this.db.sql`
        INSERT INTO users (email, password, name, role)
        VALUES (${validation.email}, ${password}, ${name}, 'manager')
        RETURNING id, email, name, role
      `;

      if (!result || result.length === 0) {
        throw new ConflictException('Failed to create user account');
      }
      user = result[0];
    }

    // Create manager relation (prevent duplicate)
    const existingRelations = await this.db.sql`
      SELECT id FROM property_manager_relations 
      WHERE manager_id = ${user.id.toString()} AND landlord_id = ${validation.landlordId}
    `;

    if (!existingRelations || existingRelations.length === 0) {
      await this.db.sql`
        INSERT INTO property_manager_relations (manager_id, landlord_id)
        VALUES (${user.id.toString()}, ${validation.landlordId})
      `;
    }

    // Mark invitation as used
    await this.db.sql`
      UPDATE invitations
      SET used = TRUE
      WHERE id = ${token}
    `;

    // Asynchronously send signup confirmation
    this.communicationService.sendSignupConfirmation(user.email, user.name, user.role).catch(err => {
      console.error('Failed to send signup confirmation:', err);
    });

    return user;
  }

  async getTeam(landlordId: string) {
    // Get all manager accounts
    const managers = await this.db.sql`
      SELECT u.id, u.email, u.name, u.role
      FROM users u
      JOIN property_manager_relations r ON u.id::varchar = r.manager_id
      WHERE r.landlord_id = ${landlordId}
    `;

    // Get all pending active invitations
    const invitations = await this.db.sql`
      SELECT id, email, expires_at, used
      FROM invitations
      WHERE landlord_id = ${landlordId} AND used = FALSE AND expires_at > NOW()
    `;

    return {
      managers,
      invitations
    };
  }

  async getConnections(userId: string, role: string) {
    let managers: any[] = [];
    let landlords: any[] = [];

    const userIdStr = userId.toString();

    if (role === 'landlord') {
      managers = await this.db.sql`
        SELECT u.id, u.email, u.name, u.role
        FROM users u
        JOIN property_manager_relations r ON u.id::varchar = r.manager_id
        WHERE r.landlord_id = ${userIdStr}
      `;
    } else if (role === 'manager') {
      landlords = await this.db.sql`
        SELECT u.id, u.email, u.name, u.role
        FROM users u
        JOIN property_manager_relations r ON u.id::varchar = r.landlord_id
        WHERE r.manager_id = ${userIdStr}
      `;
    }

    // Get pending invitations/codes generated by or for this user
    const pendingCodes = await this.db.sql`
      SELECT id, email, expires_at as "expiresAt", target_role as "targetRole", property_id as "propertyId", unit
      FROM invitations
      WHERE (landlord_id = ${userIdStr} OR created_by_id = ${userIdStr}) AND used = FALSE AND expires_at > NOW()
    `;

    return {
      managers,
      landlords,
      pendingCodes
    };
  }

  async generateLinkCode(data: { landlordId: string; targetRole: 'tenant' | 'landlord'; propertyId?: string; unit?: string; createdById: string; email?: string }) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.db.sql`
      INSERT INTO invitations (id, landlord_id, email, expires_at, used, target_role, property_id, unit, created_by_id)
      VALUES (
        ${code}, 
        ${data.landlordId}, 
        ${data.email || null}, 
        ${expiresAt}, 
        FALSE, 
        ${data.targetRole}, 
        ${data.propertyId || null}, 
        ${data.unit || null}, 
        ${data.createdById}
      )
    `;

    return { success: true, code, targetRole: data.targetRole };
  }

  async claimLinkCode(code: string, userId: string) {
    const codeUpper = code.trim().toUpperCase();
    
    // Find invitation
    const invites = await this.db.sql`
      SELECT id, landlord_id as "landlordId", email, expires_at as "expiresAt", used, target_role as "targetRole", property_id as "propertyId", unit, created_by_id as "createdById"
      FROM invitations
      WHERE id = ${codeUpper}
    `;

    if (!invites || invites.length === 0) {
      throw new BadRequestException('Invalid connection code');
    }

    const invite = invites[0];
    if (invite.used) {
      throw new BadRequestException('This code has already been used');
    }

    if (new Date(invite.expiresAt) < new Date()) {
      throw new BadRequestException('This code has expired');
    }

    // Get user details
    const users = await this.db.sql`
      SELECT id, email, name, role FROM users WHERE id = ${parseInt(userId) || 0} OR CAST(id AS VARCHAR) = ${userId}
    `;
    if (!users || users.length === 0) {
      throw new BadRequestException('User not found');
    }
    const user = users[0];

    if (invite.targetRole === 'tenant') {
      // 1. Existing Tenant links themselves to a property contact record
      if (user.role !== 'tenant') {
        throw new BadRequestException('Only tenant accounts can link to properties');
      }

      // Update tenant_contacts record
      await this.db.sql`
        UPDATE tenant_contacts
        SET user_id = ${parseInt(userId) || 0}, email = ${user.email}
        WHERE property_id = ${invite.propertyId} AND unit = ${invite.unit}
      `;

      // Update any invoices for that unit to point to the tenant email
      await this.db.sql`
        UPDATE invoices
        SET tenant_email = ${user.email}, tenant_name = ${user.name}
        WHERE property_name = (SELECT name FROM properties WHERE id = ${invite.propertyId} LIMIT 1) AND unit_number = ${invite.unit}
      `;
      
      // Update any tickets
      await this.db.sql`
        UPDATE tickets
        SET tenant_email = ${user.email}
        WHERE property_name = (SELECT name FROM properties WHERE id = ${invite.propertyId} LIMIT 1) AND unit_number = ${invite.unit}
      `;

    } else if (invite.targetRole === 'landlord') {
      // 2. Manager links to a landlord
      if (user.role !== 'landlord') {
        throw new BadRequestException('Only landlord accounts can claim manager connections');
      }

      const managerId = invite.createdById;
      const landlordId = user.id.toString();

      // Check if relation already exists
      const existingRelations = await this.db.sql`
        SELECT id FROM property_manager_relations 
        WHERE manager_id = ${managerId} AND landlord_id = ${landlordId}
      `;

      if (!existingRelations || existingRelations.length === 0) {
        await this.db.sql`
          INSERT INTO property_manager_relations (manager_id, landlord_id)
          VALUES (${managerId}, ${landlordId})
        `;
      }

      // Move manager's listed properties and data to landlord's account
      await this.db.sql`
        UPDATE properties
        SET landlord_id = ${landlordId}
        WHERE landlord_id = ${managerId}
      `;
      await this.db.sql`
        UPDATE tenant_contacts
        SET landlord_id = ${landlordId}
        WHERE landlord_id = ${managerId}
      `;
      await this.db.sql`
        UPDATE invoices
        SET landlord_id = ${landlordId}
        WHERE landlord_id = ${managerId}
      `;
      await this.db.sql`
        UPDATE tickets
        SET landlord_id = ${landlordId}
        WHERE landlord_id = ${managerId}
      `;
    }

    // Mark code as used
    await this.db.sql`
      UPDATE invitations
      SET used = TRUE
      WHERE id = ${codeUpper}
    `;

    return { success: true, targetRole: invite.targetRole };
  }

  async previewLinkCode(code: string) {
    const codeUpper = code.trim().toUpperCase();
    const invites = await this.db.sql`
      SELECT id, landlord_id as "landlordId", email, expires_at as "expiresAt", used, target_role as "targetRole", property_id as "propertyId", unit, created_by_id as "createdById"
      FROM invitations
      WHERE id = ${codeUpper}
    `;

    if (!invites || invites.length === 0) {
      throw new BadRequestException('Invalid connection code');
    }

    const invite = invites[0];
    if (invite.used) {
      throw new BadRequestException('This code has already been used');
    }

    if (new Date(invite.expiresAt) < new Date()) {
      throw new BadRequestException('This code has expired');
    }

    if (invite.targetRole !== 'tenant') {
      throw new BadRequestException('This code is not a tenant connection code');
    }

    // Query property name
    let propertyName = '';
    if (invite.propertyId) {
      const props = await this.db.sql`
        SELECT name FROM properties WHERE id = ${invite.propertyId} LIMIT 1
      `;
      if (props && props.length > 0) {
        propertyName = props[0].name;
      }
    }

    // Query landlord/manager name
    let managerName = 'Sarah Jenkins';
    const landlordIdStr = invite.landlordId.toString();
    const landlords = await this.db.sql`
      SELECT name FROM users WHERE id = ${parseInt(landlordIdStr) || 0} OR CAST(id AS VARCHAR) = ${landlordIdStr} LIMIT 1
    `;
    if (landlords && landlords.length > 0) {
      managerName = landlords[0].name;
    }

    // Query invoices for this unit
    const dbInvoices = await this.db.sql`
      SELECT id, amount_due as "amountDue", status, description
      FROM invoices
      WHERE (tenant_email = ${invite.email} OR (property_name = ${propertyName} AND unit_number = ${invite.unit}))
        AND status = 'Unpaid'
    `;

    const totalAmount = dbInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amountDue || '0'), 0);

    return {
      propertyName,
      managerName,
      unit: invite.unit,
      email: invite.email,
      totalAmount,
      invoices: dbInvoices.map((inv: any) => ({
        id: inv.id,
        amount: parseFloat(inv.amountDue || '0'),
        description: inv.description || 'Unpaid fee'
      }))
    };
  }

  async updateRole(userId: string, role: string) {
    const userIdStr = userId.toString();
    await this.db.sql`
      UPDATE users
      SET role = ${role}
      WHERE id = ${parseInt(userIdStr) || 0} OR CAST(id AS VARCHAR) = ${userIdStr}
    `;
    const users = await this.db.sql`
      SELECT id, email, name, role FROM users WHERE id = ${parseInt(userIdStr) || 0} OR CAST(id AS VARCHAR) = ${userIdStr}
    `;
    return users[0];
  }
}
