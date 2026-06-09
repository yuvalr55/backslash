import { Request, Response } from 'express';
import { ErrorCode } from './error-codes';
import { MiddlewareErrorMessages } from './middleware-errors';
import { HttpStatus } from '../utils/http-status';

export function notFound(req: Request, res: Response): void {
  res.status(HttpStatus.NotFound).json({
    error: {
      code: ErrorCode.NotFound,
      message: MiddlewareErrorMessages.routeNotFound(req.method, req.path),
    },
  });
}
