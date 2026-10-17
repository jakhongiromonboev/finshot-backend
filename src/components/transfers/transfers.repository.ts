import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import type {
  NewTransferRecord,
  TransferRecord,
} from "../../libs/dto/transfers/transfer.types.js";

const SELECT_TRANSFER = `
  SELECT
    transfer_id AS transferId,
    customer_id AS customerId,
    idempotency_key AS idempotencyKey,
    send_currency AS sendCurrency,
    send_amount AS sendAmount,
    receive_currency AS receiveCurrency,
    receive_amount AS receiveAmount,
    fee,
    total_debit AS totalDebit,
    recipient_name AS recipientName,
    status,
    created_at AS createdAt
  FROM transfers
`;

@Injectable()
export class TransfersRepository {
  constructor(private readonly database: DatabaseService) {}

  customerExists(customerId: string): boolean {
    const row = this.database
      .prepare("SELECT customer_id FROM customers WHERE customer_id = ?")
      .get(customerId);

    return row !== undefined;
  }

  findById(transferId: string): TransferRecord | undefined {
    return this.database
      .prepare(`${SELECT_TRANSFER} WHERE transfer_id = ?`)
      .get(transferId) as TransferRecord | undefined;
  }

  findByIdempotencyKey(idempotencyKey: string): TransferRecord | undefined {
    return this.database
      .prepare(`${SELECT_TRANSFER} WHERE idempotency_key = ?`)
      .get(idempotencyKey) as TransferRecord | undefined;
  }

  insert(transfer: NewTransferRecord): boolean {
    const result = this.database
      .prepare(
        `
        INSERT INTO transfers (
          transfer_id, customer_id, idempotency_key,
          send_currency, send_amount, receive_currency, receive_amount,
          fee, total_debit, recipient_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (idempotency_key) DO NOTHING
      `,
      )
      .run(
        transfer.transferId,
        transfer.customerId,
        transfer.idempotencyKey,
        transfer.sendCurrency,
        transfer.sendAmount,
        transfer.receiveCurrency,
        transfer.receiveAmount,
        transfer.fee,
        transfer.totalDebit,
        transfer.recipientName,
        transfer.createdAt,
      );

    return result.changes === 1;
  }

  cancelIfRequested(transferId: string): boolean {
    const result = this.database
      .prepare(
        `
        UPDATE transfers
        SET status = 'CANCELLED'
        WHERE transfer_id = ? AND status = 'REQUESTED'
      `,
      )
      .run(transferId);

    return result.changes === 1;
  }
}
