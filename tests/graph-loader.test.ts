import path from 'path';
import fs from 'fs';
import os from 'os';
import { loadGraph, GraphLoadError } from '../src/graph/graph-loader';

const REAL_GRAPH = path.resolve(__dirname, '../data/graph.json');

describe('loadGraph', () => {
  it('loads the real graph.json without throwing', () => {
    const data = loadGraph(REAL_GRAPH);
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.edges.length).toBeGreaterThan(0);
  });

  it('returns nodes with expected fields', () => {
    const { nodes } = loadGraph(REAL_GRAPH);
    const frontend = nodes.find((n) => n.name === 'frontend');
    expect(frontend).toBeDefined();
    expect(frontend?.kind).toBe('service');
    expect(frontend?.publicExposed).toBe(true);
  });

  it('normalises scalar "to" edge to array', () => {
    const { edges } = loadGraph(REAL_GRAPH);
    const consignEdge = edges.find((e) => e.from === 'consign-service');
    expect(consignEdge).toBeDefined();
    expect(Array.isArray(consignEdge?.to)).toBe(true);
    expect(consignEdge?.to).toContain('consign-price-service');
  });

  it('throws GraphLoadError for missing file', () => {
    expect(() => loadGraph('/nonexistent/path/graph.json')).toThrow(GraphLoadError);
  });

  it('throws GraphLoadError for invalid JSON', () => {
    const tmp = path.join(os.tmpdir(), 'bad-graph.json');
    fs.writeFileSync(tmp, 'not json');
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when nodes array is missing', () => {
    const tmp = path.join(os.tmpdir(), 'no-nodes.json');
    fs.writeFileSync(tmp, JSON.stringify({ edges: [] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when edges array is missing', () => {
    const tmp = path.join(os.tmpdir(), 'no-edges.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when an edge has a null "from" field', () => {
    const tmp = path.join(os.tmpdir(), 'null-from.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [], edges: [{ from: null, to: ['a'] }] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when an edge has a numeric "from" field', () => {
    const tmp = path.join(os.tmpdir(), 'num-from.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [], edges: [{ from: 42, to: ['a'] }] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when an edge has an empty-string "from" field', () => {
    const tmp = path.join(os.tmpdir(), 'empty-from.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [], edges: [{ from: '', to: ['a'] }] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when top-level JSON is an array, not an object', () => {
    const tmp = path.join(os.tmpdir(), 'array-root.json');
    fs.writeFileSync(tmp, JSON.stringify([{ nodes: [], edges: [] }]));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when top-level JSON is null', () => {
    const tmp = path.join(os.tmpdir(), 'null-root.json');
    fs.writeFileSync(tmp, 'null');
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when a node has a missing name', () => {
    const tmp = path.join(os.tmpdir(), 'no-name.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [{ kind: 'service' }], edges: [] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when a node has an unrecognised kind', () => {
    const tmp = path.join(os.tmpdir(), 'bad-kind.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [{ name: 'x', kind: 'kafka' }], edges: [] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when publicExposed is a non-boolean', () => {
    const tmp = path.join(os.tmpdir(), 'bad-exposed.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [{ name: 'x', kind: 'service', publicExposed: 'yes' }], edges: [] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when vulnerabilities is a non-array', () => {
    const tmp = path.join(os.tmpdir(), 'bad-vulns.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [{ name: 'x', kind: 'service', vulnerabilities: 'none' }], edges: [] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('throws GraphLoadError when an edge "to" item is not a string', () => {
    const tmp = path.join(os.tmpdir(), 'bad-to.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [], edges: [{ from: 'a', to: [42] }] }));
    expect(() => loadGraph(tmp)).toThrow(GraphLoadError);
    fs.unlinkSync(tmp);
  });

  it('accepts a valid graph with no edges (isolated nodes only)', () => {
    const tmp = path.join(os.tmpdir(), 'no-edges-valid.json');
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [{ name: 'solo', kind: 'service' }], edges: [] }));
    const data = loadGraph(tmp);
    expect(data.nodes).toHaveLength(1);
    expect(data.edges).toHaveLength(0);
    fs.unlinkSync(tmp);
  });
});
