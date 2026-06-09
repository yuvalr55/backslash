import express, { Express, RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import healthRouter from './health/health.routes';
import graphRouter from './graph/graph.routes';

export function createApp(swaggerDocument?: Record<string, unknown>): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  if (swaggerDocument) {
    // swagger-ui-express types serve as RequestHandler[] but app.use expects variadic args
    app.use('/docs', ...(swaggerUi.serve as RequestHandler[]), swaggerUi.setup(swaggerDocument));
  }

  app.use(healthRouter);
  app.use('/graph', graphRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
