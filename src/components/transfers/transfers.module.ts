import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { TransfersRepository } from './transfers.repository.js';
import { TransfersService } from './transfers.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [TransfersRepository, TransfersService],
})
export class TransfersModule {}
