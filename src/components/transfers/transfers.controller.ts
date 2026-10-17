import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
} from "@nestjs/common";
import { CreateTransferDto } from "../../libs/dto/transfers/create-transfer.dto.js";
import type { TransferRecord } from "../../libs/dto/transfers/transfer.types.js";
import { TransfersService } from "./transfers.service.js";

@Controller("transfers")
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(
    @Body() dto: CreateTransferDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ): TransferRecord {
    return this.transfersService.create(dto, idempotencyKey);
  }

  @Get(":transferId")
  findById(@Param("transferId") transferId: string): TransferRecord {
    return this.transfersService.findById(transferId);
  }

  @Post(":transferId/cancel")
  @HttpCode(200)
  cancel(@Param("transferId") transferId: string): TransferRecord {
    return this.transfersService.cancel(transferId);
  }
}
