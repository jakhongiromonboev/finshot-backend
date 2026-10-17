import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { TransfersController } from './transfers.controller.js';
import { TransfersRepository } from './transfers.repository.js';
import { TransfersService } from './transfers.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TransfersController],
  providers: [TransfersRepository, TransfersService],
})
export class TransfersModule {}
