import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { TransfersRepository } from './transfers.repository.js';

@Module({
  imports: [DatabaseModule],
  providers: [TransfersRepository],
})
export class TransfersModule {}
