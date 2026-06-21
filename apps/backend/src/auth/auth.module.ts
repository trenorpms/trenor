import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, DatabaseService],
  exports: [AuthService],
})
export class AuthModule {}
