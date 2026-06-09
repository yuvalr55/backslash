import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { initGraphService } from '../../src/graph/graph-service';
import { loadGraph } from '../../src/graph/graph-loader';
import { ErrorCode } from '../../src/middleware/error-codes';
import path from 'path';

const GRAPH_PATH = path.resolve(__dirname, '../../data/graph.json');

describe('GET /graph', () => {
  let app: Express;

  beforeAll(() => {
    initGraphService(loadGraph(GRAPH_PATH));
    app = createApp();
  });

  it('returns 200 with nodes, edges, and meta', async () => {
    const res = await request(app).get('/graph');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.nodes)).toBe(true);
    expect(Array.isArray(res.body.edges)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.appliedFilters).toEqual([]);
  });

  it('nodes contain expected fields', async () => {
    const res = await request(app).get('/graph');
    const frontend = res.body.nodes.find((n: { name: string }) => n.name === 'frontend');
    expect(frontend).toBeDefined();
    expect(frontend.kind).toBe('service');
    expect(frontend.publicExposed).toBe(true);
  });

  it('publicExposed=true returns only routes starting from public nodes', async () => {
    const res = await request(app).get('/graph?publicExposed=true');
    expect(res.status).toBe(200);
    expect(res.body.meta.appliedFilters).toContain('publicExposed');
    expect(res.body.nodes.length).toBeGreaterThan(0);
  });

  it('sink=true returns only routes ending at sinks and the response contains sink nodes', async () => {
    const res = await request(app).get('/graph?sink=true');
    expect(res.status).toBe(200);
    expect(res.body.meta.appliedFilters).toContain('sink');
    expect(res.body.meta.routeCount).toBeGreaterThan(0);

    const nodes: Array<{ name: string; kind: string }> = res.body.nodes;
    const edges: Array<{ from: string; to: string }> = res.body.edges;

    // Every node in the result that has no outgoing edge is a terminal node —
    // verify at least one is a known sink kind (rds or sqs).
    const targetNames = new Set(edges.map((e) => e.to));
    const sourceNames = new Set(edges.map((e) => e.from));
    const terminalNodes = nodes.filter((n) => !sourceNames.has(n.name) || targetNames.has(n.name));
    const sinkNodes = nodes.filter((n) => n.kind !== 'service');
    expect(sinkNodes.length).toBeGreaterThan(0);
    expect(terminalNodes.length).toBeGreaterThan(0);
  });

  it('vulnerability=true returns routes with vulnerable nodes', async () => {
    const res = await request(app).get('/graph?vulnerability=true');
    expect(res.status).toBe(200);
    expect(res.body.meta.appliedFilters).toContain('vulnerability');
    const nodes: Array<{ name: string; vulnerabilities?: unknown[] }> = res.body.nodes;
    const hasVulnNode = nodes.some((n) => n.vulnerabilities && n.vulnerabilities.length > 0);
    expect(hasVulnNode).toBe(true);
  });

  it('publicExposed=false is treated as no filter applied', async () => {
    const allRes = await request(app).get('/graph');
    const filteredRes = await request(app).get('/graph?publicExposed=false');
    expect(filteredRes.status).toBe(200);
    expect(filteredRes.body.meta.appliedFilters).toEqual([]);
    expect(filteredRes.body.meta.routeCount).toBe(allRes.body.meta.routeCount);
  });

  it('combined filters: publicExposed=true&sink=true', async () => {
    const res = await request(app).get('/graph?publicExposed=true&sink=true');
    expect(res.status).toBe(200);
    expect(res.body.meta.appliedFilters).toContain('publicExposed');
    expect(res.body.meta.appliedFilters).toContain('sink');
  });

  it('returns 400 for unknown query parameter', async () => {
    const res = await request(app).get('/graph?unknown=foo');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.InvalidQueryParam);
    expect(res.body.error.message).toContain('unknown');
  });

  it('returns 400 for invalid boolean value', async () => {
    const res = await request(app).get('/graph?sink=yes');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.InvalidBoolean);
  });

  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.NotFound);
  });

  it('meta includes nodeCount and edgeCount', async () => {
    const res = await request(app).get('/graph');
    expect(res.status).toBe(200);
    expect(typeof res.body.meta.nodeCount).toBe('number');
    expect(typeof res.body.meta.edgeCount).toBe('number');
    expect(res.body.meta.nodeCount).toBe(res.body.nodes.length);
    expect(res.body.meta.edgeCount).toBe(res.body.edges.length);
  });

  it('meta nodeCount and edgeCount shrink when filters reduce routes', async () => {
    const allRes = await request(app).get('/graph');
    const filteredRes = await request(app).get('/graph?sink=true');
    expect(filteredRes.body.meta.nodeCount).toBeLessThanOrEqual(allRes.body.meta.nodeCount);
    expect(filteredRes.body.meta.edgeCount).toBeLessThanOrEqual(allRes.body.meta.edgeCount);
  });

  it('returns 400 for empty parameter value (?sink=)', async () => {
    const res = await request(app).get('/graph?sink=');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.InvalidBoolean);
  });

  it('returns 400 listing all unknown parameters when multiple are passed', async () => {
    const res = await request(app).get('/graph?foo=1&bar=2');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.InvalidQueryParam);
    expect(res.body.error.message).toContain('foo');
    expect(res.body.error.message).toContain('bar');
  });

  it('accepts duplicated param — uses first value', async () => {
    // Express parses ?sink=true&sink=false as an array; the controller picks the first value.
    const res = await request(app).get('/graph?sink=true&sink=false');
    expect(res.status).toBe(200);
    expect(res.body.meta.appliedFilters).toContain('sink');
  });

  it('all three filters combined returns non-empty result', async () => {
    const res = await request(app).get('/graph?publicExposed=true&sink=true&vulnerability=true');
    expect(res.status).toBe(200);
    expect(res.body.meta.appliedFilters).toHaveLength(3);
  });
});
