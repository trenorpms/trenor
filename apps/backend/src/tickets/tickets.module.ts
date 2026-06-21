import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { DatabaseService } from '../database.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, DatabaseService],
  exports: [TicketsService],
})
export class TicketsModule {}
