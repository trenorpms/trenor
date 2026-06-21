import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PropertiesModule } from './properties/properties.module';
import { TicketsModule } from './tickets/tickets.module';
import { AgentModule } from './agent/agent.module';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ConfigModule } from '@nestjs/config';
import { RealtimeModule } from './realtime.module';
import { CommunicationModule } from './communication/communication.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PropertiesModule,
    TicketsModule,
    AgentModule,
    AuthModule,
    OnboardingModule,
    RealtimeModule,
    CommunicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

