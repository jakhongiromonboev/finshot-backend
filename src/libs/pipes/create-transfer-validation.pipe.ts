import { BadRequestException, Injectable } from "@nestjs/common";
import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { CreateTransferDto } from "../dto/transfers/create-transfer.dto.js";
import { parseSendAmountKrw } from "../utils/parse-send-amount.util.js";

@Injectable()
export class CreateTransferValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== "body" || metadata.metatype !== CreateTransferDto) {
      return value;
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw validationError("Request body must be a JSON object");
    }

    const body = value as Record<string, unknown>;

    if (typeof body.customerId !== "string" || body.customerId.trim() === "") {
      throw validationError("customerId must be a non-empty string");
    }

    if (body.sendCurrency !== "KRW") {
      throw validationError("sendCurrency must be KRW");
    }

    if (body.receiveCurrency !== "PHP") {
      throw validationError("receiveCurrency must be PHP");
    }

    if (typeof body.recipientName !== "string" || body.recipientName.trim() === "") {
      throw validationError("recipientName must be a non-empty string");
    }

    if (body.recipientName.includes("\0")) {
      throw validationError("recipientName must not contain null characters");
    }

    // Count Unicode characters, as SQLite length() does, rather than UTF-16 units.
    if (Array.from(body.recipientName).length > 100) {
      throw validationError("recipientName must not exceed 100 characters");
    }

    let sendAmount: string;

    try {
      // Give equivalent amounts one representation: "00010000" becomes "10000".
      sendAmount = parseSendAmountKrw(body.sendAmount).toString();
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError) {
        throw validationError(error.message);
      }

      throw error;
    }

    const dto = new CreateTransferDto();
    dto.customerId = body.customerId;
    dto.sendCurrency = body.sendCurrency;
    dto.sendAmount = sendAmount;
    dto.receiveCurrency = body.receiveCurrency;
    dto.recipientName = body.recipientName;

    return dto;
  }
}

function validationError(message: string): BadRequestException {
  return new BadRequestException({ error: "VALIDATION_ERROR", message });
}
