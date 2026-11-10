import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { ZodError } from "zod";
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private logger = new Logger("API");
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();
    const pgCode = (error as { code?: string })?.code;
    const status =
      error instanceof ZodError
        ? 422
        : error instanceof HttpException
          ? error.getStatus()
          : pgCode === "23503" || pgCode === "23505"
            ? 409
            : 500;
    if (status === 500)
      this.logger.error(
        JSON.stringify({
          requestId: request.id,
          message: "Unhandled server error",
          errorType: error instanceof Error ? error.name : "Unknown",
          databaseCode: pgCode,
          frames:
            error instanceof Error
              ? error.stack?.split("\n").slice(1, 7)
              : undefined,
        }),
      );
    response.status(status).json({
      code:
        status === 500
          ? "INTERNAL_ERROR"
          : status === 409
            ? "CONFLICT"
            : status === 422
              ? "VALIDATION_ERROR"
              : "HTTP_" + status,
      message:
        status === 500
          ? "Error interno"
          : error instanceof ZodError
            ? "Revisa los campos"
            : error instanceof HttpException
              ? error.message
              : "Conflicto de integridad",
      fieldErrors: error instanceof ZodError ? error.flatten() : undefined,
      requestId: request.id,
    });
  }
}
