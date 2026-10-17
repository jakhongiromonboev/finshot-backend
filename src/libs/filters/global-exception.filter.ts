import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type {
  ArgumentsHost,
  ExceptionFilter,
  HttpServer,
} from "@nestjs/common";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapter: HttpServer) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      if (status < 500) {
        message = exception.message;
      }
    }

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    const response = host.switchToHttp().getResponse();

    if (this.httpAdapter.isHeadersSent(response)) {
      this.httpAdapter.end(response);
      return;
    }

    this.httpAdapter.reply(
      response,
      { error: this.getErrorCode(status), message },
      status,
    );
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.PAYLOAD_TOO_LARGE:
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return "VALIDATION_ERROR";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      default:
        return status >= 500 ? "INTERNAL_SERVER_ERROR" : "HTTP_ERROR";
    }
  }
}
