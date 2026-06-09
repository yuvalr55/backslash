import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/logger';
import { LogEvent } from '../logger/log-events';
import { ErrorCode } from './error-codes';
import { MiddlewareErrorMessages } from './middleware-errors';
import { HttpStatus } from '../utils/http-status';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = HttpStatus.BadRequest,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error({ event: LogEvent.UnexpectedError, err }, 'Unexpected error');
  res.status(HttpStatus.InternalServerError).json({
    error: { code: ErrorCode.InternalError, message: MiddlewareErrorMessages.unexpectedError },
  });
}
