import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { DatabaseService } from '../database.service';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [OnboardingModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, DatabaseService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
