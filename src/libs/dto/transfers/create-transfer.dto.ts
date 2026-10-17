export class CreateTransferDto {
  customerId!: string;
  sendCurrency!: "KRW";
  sendAmount!: string;
  receiveCurrency!: "PHP";
  recipientName!: string;
}
