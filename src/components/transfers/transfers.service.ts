import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { CreateTransferDto } from "../../libs/dto/transfers/create-transfer.dto.js";
import type {
  NewTransferRecord,
  TransferRecord,
} from "../../libs/dto/transfers/transfer.types.js";
import { calculateTransferMoney } from "../../libs/utils/transfer-money.util.js";
import { TransfersRepository } from "./transfers.repository.js";

@Injectable()
export class TransfersService {
  constructor(private readonly repository: TransfersRepository) {}

  create(
    dto: CreateTransferDto,
    idempotencyKey: string | undefined,
  ): TransferRecord {
    if (typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
      throw new BadRequestException({
        error: "VALIDATION_ERROR",
        message: "Idempotency key must be a non-empty string",
      });
    }

    const existingTransfer =
      this.repository.findByIdempotencyKey(idempotencyKey);

    if (existingTransfer) {
      return this.reuseTransfer(existingTransfer, dto);
    }

    if (!this.repository.customerExists(dto.customerId)) {
      throw new BadRequestException({
        error: "VALIDATION_ERROR",
        message: "Customer does not exist",
      });
    }

    const money = calculateTransferMoney(dto.sendAmount);
    const transfer: NewTransferRecord = {
      transferId: randomUUID(),
      customerId: dto.customerId,
      idempotencyKey,
      sendCurrency: dto.sendCurrency,
      sendAmount: dto.sendAmount,
      receiveCurrency: dto.receiveCurrency,
      receiveAmount: money.receiveAmount,
      fee: money.fee,
      totalDebit: money.totalDebit,
      recipientName: dto.recipientName,
      createdAt: new Date().toISOString(),
    };

    const inserted = this.repository.insert(transfer);

    if (!inserted) {
      const savedTransfer =
        this.repository.findByIdempotencyKey(idempotencyKey);

      if (!savedTransfer) {
        throw new Error(
          "Transfer was not found after an idempotency key conflict",
        );
      }

      return this.reuseTransfer(savedTransfer, dto);
    }
    return { ...transfer, status: "REQUESTED" };
  }

  private reuseTransfer(
    transfer: TransferRecord,
    dto: CreateTransferDto,
  ): TransferRecord {
    const sameRequest =
      transfer.customerId === dto.customerId &&
      transfer.sendCurrency === dto.sendCurrency &&
      transfer.sendAmount === dto.sendAmount &&
      transfer.receiveCurrency === dto.receiveCurrency &&
      transfer.recipientName === dto.recipientName;

    if (!sameRequest) {
      throw new ConflictException({
        error: "CONFLICT",
        message:
          "Idempotency key has already been used with a different request",
      });
    }

    return transfer;
  }
}
