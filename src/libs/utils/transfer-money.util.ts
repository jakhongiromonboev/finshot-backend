import type { TransferMoney } from "../dto/transfers/transfer.types.js";

export function calculateTransferMoney(sendAmount: string): TransferMoney {
  if (typeof sendAmount !== "string" || sendAmount === "") {
    throw new TypeError("sendAmount must be a non-empty string");
  }

  for (const character of sendAmount) {
    if (!"0123456789".includes(character)) {
      throw new TypeError("sendAmount must contain only decimal digits");
    }
  }

  const sendAmountKrw = BigInt(sendAmount);

  if (sendAmountKrw < 10000n) {
    throw new RangeError("sendAmount must be at least 10000");
  }

  // 1% of the send amount, rounded to a whole won.
  let feeKrw = divideAndRoundHalfUp(sendAmountKrw, 100n);

  if (feeKrw < 3000n) {
    feeKrw = 3000n;
  }

  const totalDebitKrw = sendAmountKrw + feeKrw;

  // 1 KRW = 0.0412 PHP = 4.12 centavos = 412 / 100 centavos.
  const receiveCentavos = divideAndRoundHalfUp(sendAmountKrw * 412n, 100n);
  const wholePesos = receiveCentavos / 100n;
  const centavos = (receiveCentavos % 100n).toString().padStart(2, "0");

  return {
    fee: feeKrw.toString(),
    totalDebit: totalDebitKrw.toString(),
    receiveAmount: `${wholePesos}.${centavos}`,
  };
}

// Used with nonnegative values and a positive divisor.
function divideAndRoundHalfUp(value: bigint, divisor: bigint): bigint {
  let result = value / divisor;
  const remainder = value % divisor;

  // Round up when the remainder is at least half of the divisor.
  if (remainder * 2n >= divisor) {
    result += 1n;
  }

  return result;
}
