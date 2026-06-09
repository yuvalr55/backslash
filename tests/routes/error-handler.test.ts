import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { errorHandler, AppError } from '../../src/middleware/error-handler';
import { notFound } from '../../src/middleware/not-found';
import { ErrorCode } from '../../src/middleware/error-codes';
import { HttpStatus } from '../../src/utils/http-status';

function buildApp(handler: (req: Request, res: Response, next: NextFunction) => void) {
  const app = express();
  app.get('/test', handler);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  it('returns structured error for AppError', async () => {
    const app = buildApp((_req, _res, next) => {
      next(new AppError(ErrorCode.InvalidQueryParam, 'bad param', HttpStatus.BadRequest));
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.InvalidQueryParam);
    expect(res.body.error.message).toBe('bad param');
  });

  it('returns 500 INTERNAL_ERROR for unexpected non-AppError exceptions', async () => {
    const app = buildApp((_req, _res, next) => {
      next(new Error('something exploded'));
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe(ErrorCode.InternalError);
  });

  it('returns 500 for thrown non-Error objects', async () => {
    const app = buildApp((_req, _res, next) => {
      next('raw string error');
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe(ErrorCode.InternalError);
  });
});
