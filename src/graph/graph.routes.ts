import { Router, Request, Response, NextFunction } from 'express';
import { getGraphService } from './graph-service';
import { buildGraphResponse } from './graph-response-builder';
import { filterRegistry } from '../filters/filter-registry';
import { FilterKey } from '../filters/filter.types';
import { AppError } from '../middleware/error-handler';
import { ErrorCode } from '../middleware/error-codes';
import { logger } from '../logger/logger';
import { LogEvent } from '../logger/log-events';
import { isString } from '../utils/type-guards';
import { GraphRouteErrorMessages } from './graph-route-errors';
import { HttpStatus } from '../utils/http-status';

const router = Router();

function parseBooleanParam(key: string, value: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new AppError(
    ErrorCode.InvalidBoolean,
    GraphRouteErrorMessages.invalidBoolean(key, value),
    HttpStatus.BadRequest,
  );
}

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryKeys = Object.keys(req.query);
    const unknownKeys = queryKeys.filter((k) => !filterRegistry.isKnownKey(k));
    if (unknownKeys.length > 0) {
      throw new AppError(
        ErrorCode.InvalidQueryParam,
        GraphRouteErrorMessages.unknownQueryParam(unknownKeys),
        HttpStatus.BadRequest,
      );
    }

    const activeFilters: FilterKey[] = [];
    for (const key of Object.values(FilterKey)) {
      const raw = req.query[key];
      if (raw !== undefined) {
        const scalar = Array.isArray(raw) ? raw[0] : raw;
        if (!isString(scalar)) {
          throw new AppError(
            ErrorCode.InvalidQueryParam,
            GraphRouteErrorMessages.mustBeSimpleString(key),
            HttpStatus.BadRequest,
          );
        }
        const value = parseBooleanParam(key, scalar);
        if (value) activeFilters.push(key);
      }
    }

    logger.info({ event: LogEvent.GraphQuery, appliedFilters: activeFilters }, 'Processing graph query');

    const service = getGraphService();
    const filteredRoutes = service.getFilteredRoutes(activeFilters);
    const response = buildGraphResponse(filteredRoutes, activeFilters);

    res.status(HttpStatus.Ok).json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
