import { filterRegistry } from '../../src/filters/filter-registry';
import { FilterKey } from '../../src/filters/filter.types';
import { GraphNode, NodeKind, Route, Vulnerability } from '../../src/graph/graph.types';

const vuln: Vulnerability = { file: 'x.java', severity: 'high', message: 'rce', metadata: {} };

function node(name: string, kind: NodeKind, publicExposed?: boolean, vulnerabilities?: Vulnerability[]): GraphNode {
  return { name, kind, publicExposed, vulnerabilities };
}

function applyFilters(keys: FilterKey[], routes: Route[], nodeMap: Map<string, GraphNode>): Route[] {
  return keys.reduce((acc, key) => {
    const filter = filterRegistry.getFilter(key);
    return filter ? filter.apply(acc, nodeMap) : acc;
  }, routes);
}

describe('Combined filters', () => {
  const nodeMap = new Map<string, GraphNode>();

  const publicSvc = node('gateway', NodeKind.Service, true);
  const privateSvc = node('internal', NodeKind.Service, false);
  const vulnSvc = node('auth', NodeKind.Service, true, [vuln]);
  const dbSink = node('db', NodeKind.Rds);

  const routes: Route[] = [
    [publicSvc, dbSink],           // public + sink
    [privateSvc, dbSink],          // sink only
    [publicSvc, privateSvc],       // public only
    [vulnSvc, dbSink],             // vulnerability + sink + public
    [privateSvc, privateSvc],      // nothing
  ];

  it('publicExposed + sink: keeps routes that start public AND end at sink', () => {
    const result = applyFilters([FilterKey.PublicExposed, FilterKey.Sink], routes, nodeMap);
    expect(result).toHaveLength(2);
    const names = result.map((r) => r[0].name);
    expect(names).toContain('gateway');
    expect(names).toContain('auth');
  });

  it('publicExposed + vulnerability: keeps routes that are public AND have a vulnerability', () => {
    const result = applyFilters([FilterKey.PublicExposed, FilterKey.Vulnerability], routes, nodeMap);
    expect(result).toHaveLength(1);
    expect(result[0][0].name).toBe('auth');
  });

  it('all three filters combined', () => {
    const result = applyFilters([FilterKey.PublicExposed, FilterKey.Sink, FilterKey.Vulnerability], routes, nodeMap);
    expect(result).toHaveLength(1);
    expect(result[0][0].name).toBe('auth');
  });

  it('no filters: returns all routes', () => {
    const result = applyFilters([], routes, nodeMap);
    expect(result).toHaveLength(routes.length);
  });
});
