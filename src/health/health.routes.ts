import { Router } from 'express';
import { isGraphServiceReady } from '../graph/graph-service';
import { HealthStatus } from './health.types';
import { HttpStatus } from '../utils/http-status';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(HttpStatus.Ok).json({ status: HealthStatus.Ok });
});

router.get('/ready', (_req, res) => {
  if (isGraphServiceReady()) {
    res.status(HttpStatus.Ok).json({ status: HealthStatus.Ready });
  } else {
    res.status(HttpStatus.ServiceUnavailable).json({ status: HealthStatus.Unavailable, reason: 'Graph not loaded' });
  }
});

export default router;
