import request from 'supertest';
import { createApp } from '../../src/app';
import { initGraphService } from '../../src/graph/graph-service';
import { loadGraph } from '../../src/graph/graph-loader';
import { HealthStatus } from '../../src/health/health.types';
import path from 'path';

const GRAPH_PATH = path.resolve(__dirname, '../../data/graph.json');

describe('Health routes', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('returns 200 with { status: "ok" } regardless of graph state', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: HealthStatus.Ok });
    });
  });

  describe('GET /ready', () => {
    // At this point in the file the graph singleton is null (fresh module context).
    it('returns 503 when graph is not loaded', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe(HealthStatus.Unavailable);
    });

    it('returns 200 after graph is loaded', async () => {
      initGraphService(loadGraph(GRAPH_PATH));
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(HealthStatus.Ready);
    });
  });
});
