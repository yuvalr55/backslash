import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/logger';
import { LogEvent } from '../logger/log-events';
import { config } from '../config/env';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (!config.requestLoggingEnabled) {
    next();
    return;
  }

  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      event: LogEvent.HttpRequest,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      query: req.query,
    });
  });
  next();
}
