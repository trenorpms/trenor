import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentToolsService } from './agent-tools.service';
import { SophiaToolsService } from './sophia-tools.service';
import { SophiaOrchestratorService } from './sophia-orchestrator.service';
import { DatabaseService } from '../database.service';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { PropertiesModule } from '../properties/properties.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime.module';

@Module({
  imports: [
    OnboardingModule,
    PropertiesModule,
    TicketsModule,
    AuthModule,
    RealtimeModule,
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentToolsService,
    SophiaToolsService,
    SophiaOrchestratorService,
    DatabaseService,
  ],
  exports: [AgentService, SophiaToolsService, SophiaOrchestratorService],
})
export class AgentModule {}
