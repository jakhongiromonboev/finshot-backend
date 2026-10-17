export function parseSendAmountKrw(sendAmount: unknown): bigint {
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

  return sendAmountKrw;
}
