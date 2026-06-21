import { Injectable } from '@nestjs/common';

export class AgentActivity {
  id!: string;
  ticketId!: string;
  status!: 'thinking' | 'acting' | 'waiting' | 'done' | 'failed';
  actionDescription!: string;
  timestamp!: Date;
}

export class AgentConfig {
  landlordId!: string;
  tier!: 'free' | 'pro' | 'partner';
  autoApproveLimit!: number;
}

@Injectable()
export class AgentsService {
  private activities: AgentActivity[] = [
    {
      id: 'activity_1',
      ticketId: 'ticket_1',
      status: 'thinking',
      actionDescription: 'Evaluating repair urgency for faucet leak...',
      timestamp: new Date(),
    },
  ];

  private configs: AgentConfig[] = [
    { landlordId: 'landlord_1', tier: 'partner', autoApproveLimit: 200 },
  ];

  getActivities(ticketId: string): AgentActivity[] {
    return this.activities.filter(a => a.ticketId === ticketId);
  }

  logActivity(ticketId: string, status: AgentActivity['status'], actionDescription: string): AgentActivity {
    const newActivity: AgentActivity = {
      id: Math.random().toString(36).substring(7),
      ticketId,
      status,
      actionDescription,
      timestamp: new Date(),
    };
    this.activities.push(newActivity);
    return newActivity;
  }

  getConfig(landlordId: string): AgentConfig {
    return this.configs.find(c => c.landlordId === landlordId) || {
      landlordId,
      tier: 'free',
      autoApproveLimit: 0,
    };
  }

  updateConfig(landlordId: string, tier: 'free' | 'pro' | 'partner', autoApproveLimit: number): AgentConfig {
    let config = this.configs.find(c => c.landlordId === landlordId);
    if (!config) {
      config = { landlordId, tier, autoApproveLimit };
      this.configs.push(config);
    } else {
      config.tier = tier;
      config.autoApproveLimit = autoApproveLimit;
    }
    return config;
  }
}
