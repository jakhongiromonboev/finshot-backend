export type TransferStatus =
  | 'REQUESTED'
  | 'SENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface TransferRecord {
  transferId: string;
  customerId: string;
  idempotencyKey: string;
  sendCurrency: 'KRW';
  sendAmount: string;
  receiveCurrency: 'PHP';
  receiveAmount: string;
  fee: string;
  totalDebit: string;
  recipientName: string;
  status: TransferStatus;
  createdAt: string;
}

export type NewTransferRecord = Omit<TransferRecord, 'status'>;

export type TransferMoney = Pick<TransferRecord, 'fee' | 'totalDebit' | 'receiveAmount'>;
