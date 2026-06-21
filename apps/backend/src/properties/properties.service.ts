import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { RealtimeGateway } from '../realtime.gateway';

export class Property {
  id!: string;
  name!: string;
  address!: string;
  landlordId!: string;
  unitsCount!: number;
  status!: string;
}

@Injectable()
export class PropertiesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly realtime: RealtimeGateway
  ) {}

  async resolveLandlordId(userId: string): Promise<string> {
    const relations = await this.db.sql`
      SELECT landlord_id
      FROM property_manager_relations
      WHERE manager_id = ${userId}
    `;
    if (relations && relations.length > 0) {
      return relations[0].landlord_id;
    }
    return userId;
  }

  async findAll(landlordId: string): Promise<Property[]> {
    const properties = await this.db.sql`
      SELECT id, name, address, landlord_id as "landlordId", units_count as "unitsCount", status
      FROM properties
      WHERE landlord_id = ${landlordId}
    `;
    const tenants = await this.db.sql`
      SELECT property_id as "propertyId", rent, arrears FROM tenant_contacts WHERE landlord_id = ${landlordId}
    `;

    return properties.map((p: any) => {
      const propTenants = tenants.filter((t: any) => t.propertyId === p.id);
      const arrears = propTenants.reduce((sum: number, t: any) => sum + Number(t.arrears || 0), 0);
      const rent = propTenants.reduce((sum: number, t: any) => {
        const rentStr = t.rent || '0';
        const parsed = parseFloat(rentStr.replace(/[^0-9.]/g, '')) || 0;
        return sum + parsed;
      }, 0);

      return {
        ...p,
        arrears,
        rent: `€${rent.toLocaleString()}`,
        status: arrears > 0 ? 'Arrears' : 'Active'
      };
    });
  }

  async findOne(id: string, landlordId: string): Promise<Property | undefined> {
    const rows = await this.db.sql`
      SELECT id, name, address, landlord_id as "landlordId", units_count as "unitsCount", status
      FROM properties
      WHERE id = ${id} AND landlord_id = ${landlordId}
    `;
    if (!rows || rows.length === 0) return undefined;
    const p = rows[0];

    const tenants = await this.db.sql`
      SELECT rent, arrears FROM tenant_contacts WHERE property_id = ${id}
    `;
    const arrears = tenants.reduce((sum: number, t: any) => sum + Number(t.arrears || 0), 0);
    const rent = tenants.reduce((sum: number, t: any) => {
      const rentStr = t.rent || '0';
      const parsed = parseFloat(rentStr.replace(/[^0-9.]/g, '')) || 0;
      return sum + parsed;
    }, 0);

    return {
      ...p,
      arrears,
      rent: `€${rent.toLocaleString()}`,
      status: arrears > 0 ? 'Arrears' : 'Active'
    };
  }

  async create(data: Omit<Property, 'id' | 'status'>): Promise<Property> {
    const id = `prop-${Math.random().toString(36).substring(7)}`;
    const status = 'Active';
    const rows = await this.db.sql`
      INSERT INTO properties (id, name, address, landlord_id, units_count, status)
      VALUES (${id}, ${data.name}, ${data.address}, ${data.landlordId}, ${data.unitsCount}, ${status})
      RETURNING id, name, address, landlord_id as "landlordId", units_count as "unitsCount", status
    `;
    return rows[0];
  }

  async deploy(
    landlordId: string,
    payload: {
      property: { name: string; location: string; type: string; unitsCount: number; status?: string };
      tenants: Array<{ id?: string; name: string; email: string; phone: string; unit: string; rent: string; arrears: number; status?: string }>;
      invoices: Array<{ invoiceId: string; tenantName: string; tenantEmail?: string; unitNumber: string; amountDue: number; propertyName: string; status: 'Unpaid' | 'Paid' | 'Sent' }>;
    }
  ) {
    const propertyId = `prop-${Math.random().toString(36).substring(7)}`;
    const propStatus = payload.property.status || 'Active';
    
    // Insert property
    const propRows = await this.db.sql`
      INSERT INTO properties (id, name, address, landlord_id, units_count, status)
      VALUES (${propertyId}, ${payload.property.name}, ${payload.property.location}, ${landlordId}, ${payload.property.unitsCount}, ${propStatus})
      RETURNING id, name, address, landlord_id as "landlordId", units_count as "unitsCount", status
    `;

    const deployedTenants = [];
    const deployedInvoices = [];

    // Insert tenants
    for (const t of payload.tenants) {
      const tenantId = t.id || `tenant-${Math.random().toString(36).substring(7)}`;
      const tenantStatus = t.status || (t.arrears > 0 ? 'Arrears' : 'Active');
      
      const tRows = await this.db.sql`
        INSERT INTO tenant_contacts (id, name, email, phone, unit, property_id, property_name, landlord_id, rent, arrears, status)
        VALUES (${tenantId}, ${t.name}, ${t.email}, ${t.phone}, ${t.unit}, ${propertyId}, ${payload.property.name}, ${landlordId}, ${t.rent}, ${t.arrears}, ${tenantStatus})
        ON CONFLICT (email) DO UPDATE 
        SET name = EXCLUDED.name, phone = EXCLUDED.phone, unit = EXCLUDED.unit, property_id = EXCLUDED.property_id, property_name = EXCLUDED.property_name, landlord_id = EXCLUDED.landlord_id, rent = EXCLUDED.rent, arrears = EXCLUDED.arrears, status = EXCLUDED.status
        RETURNING id, name, email, phone, unit, property_id as "propertyId", property_name as "propertyName", landlord_id as "landlordId", rent, arrears, status
      `;
      deployedTenants.push(tRows[0]);
    }

    // Insert invoices
    for (const inv of payload.invoices) {
      const invId = inv.invoiceId || `INV-${Math.random().toString(36).substring(3, 9).toUpperCase()}`;
      
      let email = inv.tenantEmail;
      if (!email) {
        const found = await this.db.sql`
          SELECT email FROM tenant_contacts WHERE name = ${inv.tenantName} AND unit = ${inv.unitNumber} LIMIT 1
        `;
        email = found && found.length > 0 ? found[0].email : null;
      }
      if (!email) {
        email = `tenant_${invId.toLowerCase()}@landlord.local`;
      }

      const invRows = await this.db.sql`
        INSERT INTO invoices (id, tenant_email, tenant_name, unit_number, amount_due, property_name, landlord_id, status)
        VALUES (${invId}, ${email}, ${inv.tenantName}, ${inv.unitNumber}, ${inv.amountDue}, ${payload.property.name}, ${landlordId}, ${inv.status})
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status
        RETURNING id as "invoiceId", tenant_name as "tenantName", unit_number as "unitNumber", amount_due as "amountDue", property_name as "propertyName", status
      `;
      deployedInvoices.push(invRows[0]);
    }

    return {
      properties: propRows,
      tenants: deployedTenants,
      invoices: deployedInvoices,
    };
  }

  async updateStatus(id: string, landlordId: string, status: string) {
    await this.db.sql`
      UPDATE properties
      SET status = ${status}
      WHERE id = ${id} AND landlord_id = ${landlordId}
    `;
    return { success: true };
  }

  async edit(id: string, landlordId: string, data: { name: string; address: string; unitsCount: number }) {
    await this.db.sql`
      UPDATE properties
      SET name = ${data.name}, address = ${data.address}, units_count = ${data.unitsCount}
      WHERE id = ${id} AND landlord_id = ${landlordId}
    `;
    return { success: true };
  }

  async moveTenant(
    id: string,
    landlordId: string,
    body: { targetPropertyId: string; targetPropertyName: string; targetUnit: string; action?: 'archive' | 'interchange' }
  ) {
    const { targetPropertyId, targetPropertyName, targetUnit, action } = body;

    const tenantRows = await this.db.sql`
      SELECT name, unit, property_name FROM tenant_contacts
      WHERE id = ${id} AND landlord_id = ${landlordId}
      LIMIT 1
    `;
    if (!tenantRows || tenantRows.length === 0) return { success: false, error: 'Tenant not found' };
    const tnt = tenantRows[0];

    // Check if target unit is occupied by another active tenant
    const occupied = await this.db.sql`
      SELECT id, name, email, unit FROM tenant_contacts
      WHERE landlord_id = ${landlordId} 
        AND property_id = ${targetPropertyId} 
        AND unit = ${targetUnit} 
        AND status != 'Archived' 
      LIMIT 1
    `;

    if (occupied && occupied.length > 0) {
      const occupant = occupied[0];
      if (action === 'archive') {
        // Archive/evict the occupant
        await this.db.sql`
          UPDATE tenant_contacts
          SET status = 'Archived'
          WHERE id = ${occupant.id}
        `;
        await this.logAction(landlordId, 'Evict Tenant', `Evicted tenant ${occupant.name} from unit ${targetUnit} of ${targetPropertyName} during relocation swap`);
      } else if (action === 'interchange') {
        // Move the occupant to current tenant's space
        await this.db.sql`
          UPDATE tenant_contacts
          SET property_id = (SELECT property_id FROM tenant_contacts WHERE id = ${id}),
              property_name = (SELECT property_name FROM tenant_contacts WHERE id = ${id}),
              unit = ${tnt.property_name || tnt.unit}
          WHERE id = ${occupant.id}
        `;
        await this.logAction(landlordId, 'Swap Residents', `Interchanged tenant ${occupant.name} to unit ${tnt.unit} of ${tnt.property_name}`);
      } else {
        // Stop and return warnings
        return { warning: true, occupant: { id: occupant.id, name: occupant.name } };
      }
    }

    // Move target tenant
    await this.db.sql`
      UPDATE tenant_contacts
      SET property_id = ${targetPropertyId}, property_name = ${targetPropertyName}, unit = ${targetUnit}
      WHERE id = ${id} AND landlord_id = ${landlordId}
    `;

    await this.logAction(landlordId, 'Move Tenant', `Moved tenant ${tnt.name} from unit ${tnt.unit} of ${tnt.property_name} to unit ${targetUnit} of ${targetPropertyName}`);

    return { success: true };
  }

  async getLandlordName(landlordId: string): Promise<string> {
    const rows = await this.db.sql`
      SELECT name FROM users WHERE id = CAST(${landlordId} AS INTEGER) OR email = ${landlordId} LIMIT 1
    `;
    return rows[0]?.name || 'Landlord Operations';
  }

  async createSingleInvoice(
    landlordId: string,
    creatorName: string,
    body: { tenantEmail: string; tenantName: string; unitNumber: string; amountDue: number; propertyName: string; description: string }
  ) {
    const invId = `inv-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    // Insert invoice
    await this.db.sql`
      INSERT INTO invoices (id, tenant_email, tenant_name, unit_number, amount_due, property_name, landlord_id, status, created_by, description)
      VALUES (${invId}, ${body.tenantEmail}, ${body.tenantName}, ${body.unitNumber}, ${body.amountDue}, ${body.propertyName}, ${landlordId}, 'Unpaid', ${creatorName}, ${body.description})
    `;

    // Increment tenant arrears
    await this.db.sql`
      UPDATE tenant_contacts
      SET arrears = CAST(COALESCE(arrears, 0) AS NUMERIC) + ${body.amountDue}
      WHERE email = ${body.tenantEmail} AND landlord_id = ${landlordId}
    `;

    await this.logAction(landlordId, 'Create Invoice', `Issued manual invoice ${invId} for ${body.tenantName} (Amount: €${body.amountDue}) - Reason: ${body.description}`);

    return { success: true, invoiceId: invId };
  }

  async logAction(landlordId: string, action: string, description: string) {
    const id = `log-${Math.random().toString(36).substring(7).toUpperCase()}`;
    await this.db.sql`
      INSERT INTO audit_logs (id, landlord_id, action, description)
      VALUES (${id}, ${landlordId}, ${action}, ${description})
    `;
  }

  async reconcileInvoice(
    invoiceId: string,
    landlordId: string,
    body: { amountPaid: number; description: string; receiptUrl?: string; operatorName: string }
  ) {
    const { amountPaid, description, receiptUrl, operatorName } = body;
    const rows = await this.db.sql`
      SELECT tenant_email, tenant_name, amount_due, property_name, status
      FROM invoices
      WHERE id = ${invoiceId} AND landlord_id = ${landlordId}
      LIMIT 1
    `;
    if (!rows || rows.length === 0) return { success: false, error: 'Invoice not found' };
    const inv = rows[0];

    const reconciledBy = `reconciliated/${operatorName || 'Operator'}`;

    await this.db.sql`
      UPDATE invoices
      SET status = 'Paid',
          receipt_url = ${receiptUrl || null},
          reconciled_amount = ${amountPaid},
          reconciliation_note = ${description},
          reconciled_at = CURRENT_TIMESTAMP,
          reconciled_by = ${reconciledBy}
      WHERE id = ${invoiceId} AND landlord_id = ${landlordId}
    `;

    await this.db.sql`
      UPDATE tenant_contacts
      SET arrears = CAST(COALESCE(arrears, 0) AS NUMERIC) - ${amountPaid}
      WHERE email = ${inv.tenant_email} AND landlord_id = ${landlordId}
    `;

    await this.logAction(
      landlordId,
      'Reconcile Invoice',
      `Reconciled invoice ${invoiceId} for ${inv.tenant_name} (${reconciledBy}) - Entered Amount: €${Number(amountPaid).toLocaleString()} (Arrears updated, receipt logged)`
    );
    return { success: true };
  }

  async getInvoiceAmountDue(invoiceId: string, landlordId: string): Promise<number> {
    const rows = await this.db.sql`
      SELECT amount_due FROM invoices WHERE id = ${invoiceId} AND landlord_id = ${landlordId} LIMIT 1
    `;
    return rows[0] ? Number(rows[0].amount_due) : 0;
  }

  async findAuditLogs(landlordId: string, startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      return this.db.sql`
        SELECT id, landlord_id as "landlordId", action, description, created_at as "createdAt"
        FROM audit_logs
        WHERE landlord_id = ${landlordId}
          AND created_at >= CAST(${startDate} AS TIMESTAMP)
          AND created_at <= CAST(${endDate} AS TIMESTAMP)
        ORDER BY created_at DESC
      `;
    } else if (startDate) {
      return this.db.sql`
        SELECT id, landlord_id as "landlordId", action, description, created_at as "createdAt"
        FROM audit_logs
        WHERE landlord_id = ${landlordId}
          AND created_at >= CAST(${startDate} AS TIMESTAMP)
        ORDER BY created_at DESC
      `;
    } else if (endDate) {
      return this.db.sql`
        SELECT id, landlord_id as "landlordId", action, description, created_at as "createdAt"
        FROM audit_logs
        WHERE landlord_id = ${landlordId}
          AND created_at <= CAST(${endDate} AS TIMESTAMP)
        ORDER BY created_at DESC
      `;
    } else {
      return this.db.sql`
        SELECT id, landlord_id as "landlordId", action, description, created_at as "createdAt"
        FROM audit_logs
        WHERE landlord_id = ${landlordId}
        ORDER BY created_at DESC
      `;
    }
  }

  async findExpenses(landlordId: string) {
    return this.db.sql`
      SELECT id, description, amount, category, property_id as "propertyId", property_name as "propertyName", created_at as "createdAt"
      FROM expenses
      WHERE landlord_id = ${landlordId}
      ORDER BY created_at DESC
    `;
  }

  async createExpense(
    landlordId: string,
    body: { description: string; amount: number; category: string; propertyId: string; propertyName: string }
  ) {
    const expId = `exp-${Math.random().toString(36).substring(7).toUpperCase()}`;
    await this.db.sql`
      INSERT INTO expenses (id, description, amount, category, property_id, property_name, landlord_id)
      VALUES (${expId}, ${body.description}, ${body.amount}, ${body.category}, ${body.propertyId}, ${body.propertyName}, ${landlordId})
    `;
    await this.logAction(landlordId, 'Record Expense', `Recorded operational expense ${expId} for ${body.propertyName} (Amount: KES ${body.amount}) - Description: ${body.description}`);
    return { success: true, expenseId: expId };
  }

  async findTenants(landlordId: string) {
    return this.db.sql`
      SELECT id, name, email, phone, unit, property_id as "propertyId", property_name as "propertyName", landlord_id as "landlordId", rent, arrears, status
      FROM tenant_contacts
      WHERE landlord_id = ${landlordId}
    `;
  }

  async findVacantUnits(propertyId: string, landlordId: string) {
    // 1. Get explicit vacant units from DB (e.g., rows where name is empty/null or status is vacant)
    const dbVacantUnits = await this.db.sql`
      SELECT id, unit, rent, arrears, status
      FROM tenant_contacts
      WHERE property_id = ${propertyId}
        AND landlord_id = ${landlordId}
        AND (name IS NULL OR name = '' OR LOWER(status) = 'vacant')
    `;

    // 2. Get property info for context
    const propRows = await this.db.sql`
      SELECT name, units_count as "unitsCount" FROM properties WHERE id = ${propertyId} AND landlord_id = ${landlordId} LIMIT 1
    `;
    if (!propRows || propRows.length === 0) {
      return { vacantUnits: [], propertyName: '', totalUnits: 0 };
    }
    const propertyName = propRows[0].name;
    const totalUnits = propRows[0].unitsCount;

    // 3. Get all occupied units
    const occupiedUnits = await this.db.sql`
      SELECT id, unit, rent, arrears, status
      FROM tenant_contacts
      WHERE property_id = ${propertyId}
        AND landlord_id = ${landlordId}
        AND name IS NOT NULL AND name != '' AND LOWER(status) != 'vacant'
    `;

    // 4. Calculate missing vacant units count
    const totalOccupied = occupiedUnits.length;
    const totalDbVacant = dbVacantUnits.length;
    const currentTotalUnitsInDb = totalOccupied + totalDbVacant;
    const missingCount = Math.max(0, totalUnits - currentTotalUnitsInDb);

    let vacantUnits = [...dbVacantUnits];

    if (missingCount > 0) {
      // Collect all taken unit numbers
      const takenUnitNumbers = new Set<string>();
      occupiedUnits.forEach((u: any) => { if (u.unit) takenUnitNumbers.add(u.unit.trim()); });
      dbVacantUnits.forEach((u: any) => { if (u.unit) takenUnitNumbers.add(u.unit.trim()); });

      // Calculate average rent of occupied units as a default
      let totalRent = 0;
      let rentCount = 0;
      occupiedUnits.forEach((u: any) => {
        if (u.rent) {
          const parsed = parseFloat(u.rent.replace(/[^\d.-]/g, ''));
          if (!isNaN(parsed) && parsed > 0) {
            totalRent += parsed;
            rentCount++;
          }
        }
      });
      const defaultRent = rentCount > 0 ? Math.round(totalRent / rentCount).toString() : '1000';

      // Infer dominant pattern of occupied units to generate candidates
      const occupiedArray = occupiedUnits.map((u: any) => u.unit ? u.unit.trim() : '');
      
      let pattern1Matches = 0;
      let pattern2Matches = 0;

      occupiedArray.forEach((unit: string) => {
        if (/^\d{3,4}$/.test(unit)) {
          pattern1Matches++;
        } else if (/^\d+[A-Za-z]$/.test(unit)) {
          pattern2Matches++;
        }
      });

      const candidates: string[] = [];

      if (pattern1Matches >= occupiedArray.length * 0.5 && occupiedArray.length > 0) {
        // Pattern 1: floor-based numeric
        let maxFloor = 5;
        let maxRoom = 10;
        occupiedArray.forEach((unit: string) => {
          const num = parseInt(unit, 10);
          if (!isNaN(num)) {
            const floor = Math.floor(num / 100);
            const room = num % 100;
            if (floor > maxFloor && floor <= 50) maxFloor = floor;
            if (room > maxRoom && room <= 50) maxRoom = room;
          }
        });

        for (let f = 1; f <= maxFloor + 2; f++) {
          for (let r = 1; r <= maxRoom; r++) {
            const unitNo = `${f}${r < 10 ? '0' + r : r}`;
            if (!takenUnitNumbers.has(unitNo)) {
              candidates.push(unitNo);
            }
          }
        }
      } else if (pattern2Matches >= occupiedArray.length * 0.5 && occupiedArray.length > 0) {
        // Pattern 2: floor-based alphanumeric
        let maxFloor = 5;
        occupiedArray.forEach((unit: string) => {
          const m = unit.match(/^(\d+)/);
          if (m) {
            const floor = parseInt(m[1], 10);
            if (floor > maxFloor && floor <= 50) maxFloor = floor;
          }
        });
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        for (let f = 1; f <= maxFloor + 2; f++) {
          for (const l of letters) {
            const unitNo = `${f}${l}`;
            if (!takenUnitNumbers.has(unitNo)) {
              candidates.push(unitNo);
            }
          }
        }
      }

      // Fill remaining candidates with simple sequential numbers if needed
      let seq = 1;
      while (candidates.length < missingCount + 50) {
        const unitNo = seq.toString();
        if (!takenUnitNumbers.has(unitNo) && !candidates.includes(unitNo)) {
          candidates.push(unitNo);
        }
        seq++;
      }

      // Select the first missingCount candidates
      const generated = candidates.slice(0, missingCount).map((unitNo) => ({
        id: `vacant-${propertyId}-${unitNo}`,
        unit: unitNo,
        rent: defaultRent,
        arrears: 0,
        status: 'Vacant'
      }));

      vacantUnits = [...vacantUnits, ...generated];
    }

    return {
      vacantUnits,
      propertyName,
      totalUnits,
    };
  }

  async addTenant(
    landlordId: string,
    creatorName: string,
    propertyId: string,
    body: {
      name: string;
      email: string;
      phone: string;
      unit: string;
      rent: string;
      inviteMode: boolean;
      securityDeposit?: number;
      utilityFee?: number;
      isNewUnit?: boolean;
    }
  ) {
    const propRows = await this.db.sql`
      SELECT name FROM properties WHERE id = ${propertyId} AND landlord_id = ${landlordId} LIMIT 1
    `;
    if (!propRows || propRows.length === 0) {
      throw new BadRequestException('Property not found');
    }
    const propertyName = propRows[0].name;

    // Check if unit is vacant/new
    const existingUnit = await this.db.sql`
      SELECT id FROM tenant_contacts WHERE property_id = ${propertyId} AND unit = ${body.unit} LIMIT 1
    `;
    const isActuallyNew = body.isNewUnit === true || (body.isNewUnit === undefined && (!existingUnit || existingUnit.length === 0));
    if (isActuallyNew) {
      // Increment properties units_count
      await this.db.sql`
        UPDATE properties SET units_count = units_count + 1 WHERE id = ${propertyId}
      `;
    }

    const tenantId = `tenant-${Math.random().toString(36).substring(7)}`;
    const tenantStatus = body.inviteMode ? 'Pending' : 'Active';
    
    // Insert or update tenant contact
    await this.db.sql`
      INSERT INTO tenant_contacts (id, name, email, phone, unit, property_id, property_name, landlord_id, rent, arrears, status)
      VALUES (${tenantId}, ${body.name}, ${body.email}, ${body.phone}, ${body.unit}, ${propertyId}, ${propertyName}, ${landlordId}, ${body.rent}, 0, ${tenantStatus})
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name, phone = EXCLUDED.phone, unit = EXCLUDED.unit, property_id = EXCLUDED.property_id, property_name = EXCLUDED.property_name, landlord_id = EXCLUDED.landlord_id, rent = EXCLUDED.rent, status = EXCLUDED.status
    `;

    let generatedCode: string | null = null;
    if (body.inviteMode) {
      generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await this.db.sql`
        INSERT INTO invitations (id, landlord_id, email, expires_at, used, target_role, property_id, unit, created_by_id)
        VALUES (${generatedCode}, ${landlordId}, ${body.email}, ${expiresAt}, FALSE, 'tenant', ${propertyId}, ${body.unit}, ${landlordId})
      `;
    }

    // Create invoices if specified
    const invoicesCreated = [];
    const rentAmount = parseFloat(body.rent.replace(/[^\d.-]/g, '')) || 0;
    
    if (rentAmount > 0) {
      const rentInvoice = await this.createSingleInvoice(landlordId, creatorName, {
        tenantEmail: body.email,
        tenantName: body.name,
        unitNumber: body.unit,
        amountDue: rentAmount,
        propertyName,
        description: `First month's rent for unit ${body.unit}`
      });
      invoicesCreated.push({ type: 'Rent', id: rentInvoice.invoiceId, amount: rentAmount });
    }

    if (body.securityDeposit && body.securityDeposit > 0) {
      const depInvoice = await this.createSingleInvoice(landlordId, creatorName, {
        tenantEmail: body.email,
        tenantName: body.name,
        unitNumber: body.unit,
        amountDue: body.securityDeposit,
        propertyName,
        description: `Security deposit for unit ${body.unit}`
      });
      invoicesCreated.push({ type: 'Security Deposit', id: depInvoice.invoiceId, amount: body.securityDeposit });
    }

    if (body.utilityFee && body.utilityFee > 0) {
      const utilInvoice = await this.createSingleInvoice(landlordId, creatorName, {
        tenantEmail: body.email,
        tenantName: body.name,
        unitNumber: body.unit,
        amountDue: body.utilityFee,
        propertyName,
        description: `Move-in utility fees for unit ${body.unit}`
      });
      invoicesCreated.push({ type: 'Utility Fee', id: utilInvoice.invoiceId, amount: body.utilityFee });
    }

    return {
      success: true,
      tenantId,
      code: generatedCode,
      invoices: invoicesCreated
    };
  }

  async findInvoices(landlordId: string, page?: number, limit?: number) {
    const unpaidSum = await this.db.sql`
      SELECT COALESCE(SUM(amount_due), 0) as total FROM invoices WHERE landlord_id = ${landlordId} AND status != 'Paid'
    `;
    const totalArrears = unpaidSum[0] ? Number(unpaidSum[0].total) : 0;

    if (page !== undefined && limit !== undefined) {
      const offset = (page - 1) * limit;
      const countRows = await this.db.sql`
        SELECT COUNT(*)::integer as count FROM invoices WHERE landlord_id = ${landlordId}
      `;
      const total = countRows[0] ? Number(countRows[0].count) : 0;

      const data = await this.db.sql`
        SELECT id as "invoiceId", tenant_email as "tenantEmail", tenant_name as "tenantName", unit_number as "unitNumber", amount_due as "amountDue", property_name as "propertyName", status, created_by as "created_by", description,
               receipt_url as "receiptUrl", reconciled_amount as "reconciledAmount", reconciliation_note as "reconciliationNote", reconciled_at as "reconciledAt", reconciled_by as "reconciledBy"
        FROM invoices
        WHERE landlord_id = ${landlordId}
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return { data, total, totalArrears };
    }

    const data = await this.db.sql`
      SELECT id as "invoiceId", tenant_email as "tenantEmail", tenant_name as "tenantName", unit_number as "unitNumber", amount_due as "amountDue", property_name as "propertyName", status, created_by as "created_by", description,
             receipt_url as "receiptUrl", reconciled_amount as "reconciledAmount", reconciliation_note as "reconciliationNote", reconciled_at as "reconciledAt", reconciled_by as "reconciledBy"
      FROM invoices
      WHERE landlord_id = ${landlordId}
      ORDER BY id DESC
    `;
    return { data, total: data.length, totalArrears };
  }

  async getUserEmail(id: string) {
    if (id === 'demo-tenant-id') return { email: 'tenant@trenor.com' };
    if (id === 'demo-landlord-id') return { email: 'landlord@trenor.com' };
    const rows = await this.db.sql`
      SELECT email FROM users WHERE id = ${parseInt(id) || 0} OR CAST(id AS VARCHAR) = ${id}
    `;
    return rows[0];
  }

  async findTenantInvoices(tenantEmail: string) {
    return this.db.sql`
      SELECT id as "invoiceId", tenant_email as "tenantEmail", tenant_name as "tenantName", unit_number as "unitNumber", amount_due as "amountDue", property_name as "propertyName", status,
             receipt_url as "receiptUrl", reconciled_amount as "reconciledAmount", reconciliation_note as "reconciliationNote", reconciled_at as "reconciledAt", reconciled_by as "reconciledBy"
      FROM invoices
      WHERE tenant_email = ${tenantEmail}
    `;
  }

  async findTenantDetails(tenantEmail: string) {
    const rows = await this.db.sql`
      SELECT id, name, email, phone, unit, property_id as "propertyId", property_name as "propertyName", landlord_id as "landlordId", rent, arrears, status
      FROM tenant_contacts
      WHERE email = ${tenantEmail}
    `;
    if (!rows || rows.length === 0) return null;
    const tenant = rows[0];

    // Fetch landlord/manager name & email
    let managerName = 'Property Manager';
    let managerEmail = '';
    if (tenant.landlordId) {
      const landlordRows = await this.db.sql`
        SELECT name, email FROM users WHERE id = ${parseInt(tenant.landlordId) || 0} OR CAST(id AS VARCHAR) = ${tenant.landlordId} LIMIT 1
      `;
      if (landlordRows && landlordRows.length > 0) {
        managerName = landlordRows[0].name;
        managerEmail = landlordRows[0].email;
      } else {
        const managerRows = await this.db.sql`
          SELECT name, email FROM users WHERE CAST(id AS VARCHAR) = ${tenant.landlordId} LIMIT 1
        `;
        if (managerRows && managerRows.length > 0) {
          managerName = managerRows[0].name;
          managerEmail = managerRows[0].email;
        }
      }
    }

    // Fetch tenant user account creation date to determine lease start
    const userRows = await this.db.sql`
      SELECT created_at as "createdAt" FROM users WHERE email = ${tenantEmail} LIMIT 1
    `;
    const joinedAt = userRows && userRows.length > 0 && userRows[0].createdAt ? new Date(userRows[0].createdAt) : new Date();
    
    // Calculate lease start as the 1st of the month they joined, or fallback
    const leaseStartDate = new Date(joinedAt.getFullYear(), joinedAt.getMonth(), 1);
    const leaseEndDate = new Date(leaseStartDate.getFullYear() + 1, leaseStartDate.getMonth(), 1);

    return {
      ...tenant,
      managerName,
      managerEmail: managerEmail || 'support@trenor.com',
      leaseStartDate: leaseStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      leaseEndDate: leaseEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      leaseTerm: '12 Months',
    };
  }

  async createInvoiceCheckoutSession(invoiceId: string, successUrl: string, cancelUrl: string) {
    const invoice = await this.db.sql`
      SELECT id, tenant_name, amount_due, property_name, tenant_email, unit_number
      FROM invoices
      WHERE id = ${invoiceId}
    `;
    if (!invoice || invoice.length === 0) {
      throw new Error('Invoice not found');
    }
    const inv = invoice[0];
    const amountInCents = Math.round(Number(inv.amount_due) * 100);

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2022-11-15' as any,
    });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: inv.tenant_email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Rent Payment - Unit ${inv.unit_number || ''}`,
              description: `Invoice ${inv.id} for ${inv.property_name || 'Rent'}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        invoiceId: inv.id,
      },
    });

    await this.db.sql`
      UPDATE invoices
      SET stripe_session_id = ${session.id}
      WHERE id = ${inv.id}
    `;

    return { checkoutUrl: session.url };
  }

  async markInvoiceAsPaid(invoiceId: string) {
    const invRows = await this.db.sql`
      SELECT id, tenant_email, amount_due, status, landlord_id FROM invoices WHERE id = ${invoiceId}
    `;
    if (!invRows || invRows.length === 0) return;
    const inv = invRows[0];
    if (inv.status === 'Paid') return;

    // Update invoice status to 'Paid'
    await this.db.sql`
      UPDATE invoices
      SET status = 'Paid'
      WHERE id = ${invoiceId}
    `;

    // Deduct arrears in tenant_contacts
    if (inv.tenant_email) {
      await this.db.sql`
        UPDATE tenant_contacts
        SET arrears = GREATEST(0, arrears - ${Number(inv.amount_due)})
        WHERE email = ${inv.tenant_email}
      `;

      // Get updated tenant arrears
      const updated = await this.db.sql`
        SELECT arrears, property_id as "propertyId" FROM tenant_contacts WHERE email = ${inv.tenant_email} LIMIT 1
      `;
      if (updated && updated.length > 0) {
        const arrears = Number(updated[0].arrears);
        if (arrears <= 0) {
          await this.db.sql`
            UPDATE tenant_contacts
            SET status = 'Active'
            WHERE email = ${inv.tenant_email}
          `;
        }

        const propertyId = updated[0].propertyId;
        if (propertyId) {
          // Check if property total arrears is 0
          const propTenants = await this.db.sql`
            SELECT arrears FROM tenant_contacts WHERE property_id = ${propertyId}
          `;
          const totalArrears = propTenants.reduce((sum: number, t: any) => sum + Number(t.arrears || 0), 0);
          if (totalArrears <= 0) {
            await this.db.sql`
              UPDATE properties
              SET status = 'Active'
              WHERE id = ${propertyId}
            `;
          }
        }
      }
    }

    // Trigger real-time notifications
    try {
      this.realtime.sendNotification(inv.landlord_id, 'landlord', {
        title: 'Rent Payment Received',
        message: `Invoice ${invoiceId} (€${Number(inv.amount_due).toLocaleString()}) paid successfully.`,
        type: 'success'
      });

      if (inv.tenant_email) {
        this.realtime.sendNotification(inv.tenant_email, 'tenant', {
          title: 'Payment Successful',
          message: `Your rent payment of €${Number(inv.amount_due).toLocaleString()} has been logged in the property ledger.`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Failed to dispatch real-time payment notification:', err);
    }
  }

  async verifyStripeSession(sessionId: string) {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2022-11-15' as any,
    });
    
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        const invoiceId = session.metadata?.invoiceId;
        if (invoiceId) {
          await this.markInvoiceAsPaid(invoiceId);
          return { success: true, invoiceId };
        }
      }
      return { success: false, reason: 'Payment not completed' };
    } catch (err: any) {
      console.error('Verify Stripe session error:', err);
      return { success: false, error: err.message };
    }
  }
}
