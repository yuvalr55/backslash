import request from 'supertest';
import { createApp } from '../src/app';
import { initGraphService } from '../src/graph/graph-service';
import { loadGraph } from '../src/graph/graph-loader';
import path from 'path';

const GRAPH_PATH = path.resolve(__dirname, '../data/graph.json');

describe('createApp', () => {
  beforeAll(() => {
    initGraphService(loadGraph(GRAPH_PATH));
  });

  it('does not mount /docs when no swaggerDocument is provided', async () => {
    const app = createApp();
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(404);
  });

  it('mounts /docs when swaggerDocument is provided', async () => {
    const doc = { openapi: '3.1.0', info: { title: 'test', version: '1.0.0' }, paths: {} };
    const app = createApp(doc as Record<string, unknown>);
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
  });
});
