import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { RealtimeGateway } from '../realtime.gateway';

export class Ticket {
  id!: string;
  description!: string;
  urgency!: 'low' | 'medium' | 'high';
  status!: 'open' | 'assigned' | 'completed' | 'on_hold';
  propertyId?: string;
  tenantId!: string;
  contractorId?: string;
  createdAt!: Date;
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly realtime: RealtimeGateway
  ) {}

  private async getTenantEmail(id: string): Promise<string> {
    const rows = await this.db.sql`
      SELECT email FROM users WHERE id = ${parseInt(id) || 0} OR CAST(id AS VARCHAR) = ${id}
    `;
    return rows[0]?.email || id;
  }

  async findAllByProperty(propertyId: string): Promise<Ticket[]> {
    return this.db.sql`
      SELECT id, description, urgency, status, tenant_email as "tenantId", property_name as "propertyName", unit_number as "unitNumber", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName", rating, rating_comment as "ratingComment"
      FROM tickets
      WHERE property_name = (SELECT name FROM properties WHERE id = ${propertyId} LIMIT 1)
      ORDER BY created_at DESC
    `;
  }

  async findAllByTenant(tenantIdOrEmail: string): Promise<Ticket[]> {
    const email = await this.getTenantEmail(tenantIdOrEmail);
    return this.db.sql`
      SELECT id, description, urgency, status, tenant_email as "tenantId", property_name as "propertyName", unit_number as "unitNumber", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName", rating, rating_comment as "ratingComment"
      FROM tickets
      WHERE tenant_email = ${email}
      ORDER BY created_at DESC
    `;
  }

  async create(data: { description: string; urgency: 'low' | 'medium' | 'high'; propertyId?: string; tenantId: string }): Promise<Ticket> {
    const email = await this.getTenantEmail(data.tenantId);
    
    // Auto-resolve property details from tenant contacts
    const tenantDetails = await this.db.sql`
      SELECT property_name, unit, landlord_id
      FROM tenant_contacts
      WHERE email = ${email}
      LIMIT 1
    `;

    const propName = tenantDetails[0]?.property_name || 'My Complex';
    const unitNo = tenantDetails[0]?.unit || 'N/A';
    const landlordId = tenantDetails[0]?.landlord_id || 'landlord';

    const id = `ticket-${Math.random().toString(36).substring(7)}`;
    const status = 'open';

    const rows = await this.db.sql`
      INSERT INTO tickets (id, description, urgency, status, tenant_email, landlord_id, property_name, unit_number)
      VALUES (${id}, ${data.description}, ${data.urgency}, ${status}, ${email}, ${landlordId}, ${propName}, ${unitNo})
      RETURNING id, description, urgency, status, tenant_email as "tenantId", created_at as "createdAt", rating, rating_comment as "ratingComment"
    `;

    try {
      this.realtime.sendNotification(landlordId, 'landlord', {
        title: 'New Maintenance Request',
        message: `Tenant logged a support ticket for Unit ${unitNo}: "${data.description.substring(0, 40)}..."`,
        type: 'warning'
      });
    } catch (err) {
      console.error('Failed to dispatch real-time ticket notification:', err);
    }

    return rows[0];
  }

  async assignContractor(id: string, contractorId: string): Promise<Ticket | undefined> {
    const rows = await this.db.sql`
      UPDATE tickets
      SET status = 'assigned', contractor_id = ${parseInt(contractorId) || 0}
      WHERE id = ${id}
      RETURNING id, description, urgency, status, tenant_email as "tenantId", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName"
    `;
    const ticket = rows[0];
    if (ticket && ticket.tenantId) {
      try {
        this.realtime.sendNotification(ticket.tenantId, 'tenant', {
          title: 'Support Dispatch Assigned',
          message: `Your request "${ticket.description.substring(0, 30)}..." has been assigned.`,
          type: 'info'
        });
      } catch (err) {
        console.error('Failed to dispatch assignment notification:', err);
      }
    }
    return ticket;
  }

  async hireContractor(id: string, contractorId: number, amount: number): Promise<Ticket | undefined> {
    const rows = await this.db.sql`
      UPDATE tickets
      SET 
        contractor_id = ${contractorId},
        amount = ${amount},
        status = 'assigned',
        contractor_accepted = FALSE
      WHERE id = ${id}
      RETURNING id, description, urgency, status, tenant_email as "tenantId", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName"
    `;
    const ticket = rows[0];
    if (ticket) {
      try {
        const contractorRows = await this.db.sql`SELECT email FROM contractors WHERE id = ${contractorId}`;
        const contractorEmail = contractorRows[0]?.email;
        if (contractorEmail) {
          this.realtime.sendNotification(contractorEmail, 'tenant', {
            title: 'New Dispatch Hire Offer',
            message: `You have received a hire offer of €${amount.toLocaleString()} for "${ticket.description.substring(0, 30)}..."`,
            type: 'info'
          });
        }
      } catch (err) {
        console.error('Failed to notify contractor:', err);
      }
    }
    return ticket;
  }

  async acceptHireOffer(id: string): Promise<Ticket | undefined> {
    const rows = await this.db.sql`
      UPDATE tickets
      SET 
        contractor_accepted = TRUE,
        status = 'assigned'
      WHERE id = ${id}
      RETURNING id, description, urgency, status, tenant_email as "tenantId", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName"
    `;
    const ticket = rows[0];
    if (ticket && ticket.tenantId) {
      try {
        this.realtime.sendNotification(ticket.tenantId, 'tenant', {
          title: 'Contractor Confirmed',
          message: `The dispatch technician has accepted the request and is on their way.`,
          type: 'success'
        });
      } catch (e) {
        console.error(e);
      }
    }
    return ticket;
  }

  async findAll(): Promise<Ticket[]> {
    return this.db.sql`
      SELECT id, description, urgency, status, tenant_email as "tenantId", property_name as "propertyName", unit_number as "unitNumber", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName"
      FROM tickets
      ORDER BY created_at DESC
    `;
  }

  async findAllByContractor(contractorId: number): Promise<Ticket[]> {
    return this.db.sql`
      SELECT id, description, urgency, status, tenant_email as "tenantId", property_name as "propertyName", unit_number as "unitNumber", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName"
      FROM tickets
      WHERE contractor_id = ${contractorId}
      ORDER BY created_at DESC
    `;
  }

  async findContractorByEmail(email: string): Promise<any | undefined> {
    const rows = await this.db.sql`
      SELECT id, name, email, specialty, phone, status, bio, hourly_rate as "hourlyRate", photo_url as "photoUrl", latitude, longitude, location_name as "locationName", onboarded
      FROM contractors
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    return rows[0];
  }

  async updateContractorProfile(email: string, data: { name?: string; specialty?: string; phone?: string; bio?: string; hourlyRate?: number; photoUrl?: string; latitude?: string; longitude?: string; locationName?: string; status?: string; onboarded?: boolean }): Promise<any> {
    const current = await this.findContractorByEmail(email);
    if (!current) return undefined;

    const name = data.name !== undefined ? data.name : current.name;
    const specialty = data.specialty !== undefined ? data.specialty : current.specialty;
    const phone = data.phone !== undefined ? data.phone : current.phone;
    const bio = data.bio !== undefined ? data.bio : current.bio;
    const hourlyRate = data.hourlyRate !== undefined ? data.hourlyRate : current.hourlyRate;
    const photoUrl = data.photoUrl !== undefined ? data.photoUrl : current.photoUrl;
    const latitude = data.latitude !== undefined ? data.latitude : current.latitude;
    const longitude = data.longitude !== undefined ? data.longitude : current.longitude;
    const locationName = data.locationName !== undefined ? data.locationName : current.locationName;
    const status = data.status !== undefined ? data.status : current.status;
    const onboarded = data.onboarded !== undefined ? data.onboarded : current.onboarded;

    const rows = await this.db.sql`
      UPDATE contractors
      SET 
        name = ${name || null},
        specialty = ${specialty || null},
        phone = ${phone || null},
        bio = ${bio || null},
        hourly_rate = ${hourlyRate || null},
        photo_url = ${photoUrl || null},
        latitude = ${latitude || null},
        longitude = ${longitude || null},
        location_name = ${locationName || null},
        status = ${status || null},
        onboarded = ${onboarded || false}
      WHERE LOWER(email) = LOWER(${email})
      RETURNING id, name, email, specialty, phone, status, bio, hourly_rate as "hourlyRate", photo_url as "photoUrl", latitude, longitude, location_name as "locationName", onboarded
    `;
    return rows[0];
  }

  async updateStatus(id: string, status: 'completed' | 'on_hold'): Promise<Ticket | undefined> {
    const rows = await this.db.sql`
      UPDATE tickets
      SET status = ${status}
      WHERE id = ${id}
      RETURNING id, description, urgency, status, tenant_email as "tenantId", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName", rating, rating_comment as "ratingComment"
    `;
    const ticket = rows[0];
    if (ticket && ticket.tenantId) {
      try {
        this.realtime.sendNotification(ticket.tenantId, 'tenant', {
          title: 'Support Ticket Update',
          message: `Your request "${ticket.description.substring(0, 30)}..." has been marked as ${status}.`,
          type: status === 'completed' ? 'success' : 'info'
        });
      } catch (err) {
        console.error('Failed to send status update notification:', err);
      }
    }
    return ticket;
  }

  async completeTicketWithRating(id: string, rating?: number, ratingComment?: string): Promise<Ticket | undefined> {
    const rows = await this.db.sql`
      UPDATE tickets
      SET 
        status = 'completed',
        rating = ${rating !== undefined ? rating : null},
        rating_comment = ${ratingComment !== undefined ? ratingComment : null}
      WHERE id = ${id}
      RETURNING id, description, urgency, status, tenant_email as "tenantId", created_at as "createdAt", contractor_id as "contractorId", amount, contractor_accepted as "contractorAccepted", photo_url as "photoUrl", location_name as "locationName", rating, rating_comment as "ratingComment"
    `;
    const ticket = rows[0];
    if (ticket && ticket.tenantId) {
      try {
        this.realtime.sendNotification(ticket.tenantId, 'tenant', {
          title: 'Support Ticket Completed',
          message: `Your request "${ticket.description.substring(0, 30)}..." has been completed.`,
          type: 'success'
        });
      } catch (err) {
        console.error('Failed to send completion notification:', err);
      }
    }
    return ticket;
  }

  async findContractors(): Promise<any[]> {
    return this.db.sql`
      SELECT id, name, email, specialty, phone, status, bio, hourly_rate as "hourlyRate", photo_url as "photoUrl", latitude, longitude, location_name as "locationName", onboarded
      FROM contractors
      ORDER BY id DESC
    `;
  }

  async addContractor(name: string, email: string, specialty: string, phone?: string): Promise<any> {
    const rows = await this.db.sql`
      INSERT INTO contractors (name, email, specialty, phone, status)
      VALUES (${name}, ${email.toLowerCase()}, ${specialty}, ${phone || null}, 'available')
      RETURNING id, name, email, specialty, phone, status
    `;
    return rows[0];
  }
}
