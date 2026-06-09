import { GraphService } from '../src/graph/graph-service';
import { GraphData, NodeKind } from '../src/graph/graph.types';
import { FilterKey } from '../src/filters/filter.types';

function makeData(
  nodes: Array<{ name: string; kind?: NodeKind; publicExposed?: boolean }>,
  edges: Array<{ from: string; to: string | string[] }>,
): GraphData {
  return {
    nodes: nodes.map(({ name, kind = NodeKind.Service, publicExposed }) => ({ name, kind, publicExposed })),
    edges: edges.map(({ from, to }) => ({
      from,
      to: Array.isArray(to) ? to : [to],
    })),
  };
}

describe('GraphService', () => {
  describe('adjacency list construction', () => {
    it('routes reflect single-target edge', () => {
      const svc = new GraphService(makeData([{ name: 'a' }, { name: 'b' }], [{ from: 'a', to: 'b' }]));
      const routes = svc.getAllRoutes();
      expect(routes[0].map(n => n.name)).toEqual(['a', 'b']);
    });

    it('routes reflect multi-target edge (fan-out)', () => {
      const svc = new GraphService(
        makeData(
          [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
          [{ from: 'a', to: ['b', 'c'] }],
        ),
      );
      const routes = svc.getAllRoutes();
      expect(routes).toHaveLength(2);
      expect(routes.map(r => r[1].name).sort()).toEqual(['b', 'c']);
    });

    it('skips edge targets that are not in the node list', () => {
      const svc = new GraphService(
        makeData([{ name: 'a' }], [{ from: 'a', to: ['b', 'unknown-svc'] }]),
      );
      // all targets unknown — 'a' has no neighbours, emits as a single-node route
      const routes = svc.getAllRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].map(n => n.name)).toEqual(['a']);
    });

    it('retains only known targets from a mixed edge', () => {
      const svc = new GraphService(
        makeData(
          [{ name: 'a' }, { name: 'known' }],
          [{ from: 'a', to: ['known', 'ghost'] }],
        ),
      );
      const routes = svc.getAllRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].map(n => n.name)).toEqual(['a', 'known']);
    });

    it('skips an edge whose source node is not in the node list', () => {
      const svc = new GraphService(
        makeData(
          [{ name: 'a' }, { name: 'b' }],
          [{ from: 'ghost-source', to: ['a', 'b'] }],
        ),
      );
      // ghost-source edge skipped — a and b are disconnected roots
      const routes = svc.getAllRoutes();
      const names = routes.flatMap(r => r.map(n => n.name));
      expect(names).toContain('a');
      expect(names).toContain('b');
    });

    it('last edge wins when the same source appears in multiple edges', () => {
      const svc = new GraphService(
        makeData(
          [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
          [
            { from: 'a', to: ['b'] },
            { from: 'a', to: ['c'] },
          ],
        ),
      );
      // second edge overwrites first — a→c exists; b becomes a disconnected root
      const routes = svc.getAllRoutes();
      const routeNames = routes.map(r => r.map(n => n.name));
      expect(routeNames).toContainEqual(['a', 'c']);
      expect(routeNames).not.toContainEqual(['a', 'b']);
    });
  });

  describe('nodeMap', () => {
    it('routes include nodes with correct kind', () => {
      const svc = new GraphService(makeData([{ name: 'svc-x', kind: NodeKind.Rds }], []));
      const routes = svc.getAllRoutes();
      expect(routes[0][0].kind).toBe(NodeKind.Rds);
    });
  });

  describe('getAllRoutes', () => {
    it('caches routes — repeated calls return equal content (copy per call, not same reference)', () => {
      const svc = new GraphService(
        makeData([{ name: 'a' }, { name: 'b' }], [{ from: 'a', to: 'b' }]),
      );
      const first = svc.getAllRoutes();
      const second = svc.getAllRoutes();
      expect(first).not.toBe(second);
      expect(first).toStrictEqual(second);
    });

    it('returns routes covering all nodes in a linear graph', () => {
      const svc = new GraphService(
        makeData([{ name: 'a' }, { name: 'b' }, { name: 'c' }], [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ]),
      );
      const routes = svc.getAllRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].map((n) => n.name)).toEqual(['a', 'b', 'c']);
    });

    it('returns single-node routes for disconnected nodes', () => {
      const svc = new GraphService(makeData([{ name: 'orphan' }], []));
      const routes = svc.getAllRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0][0].name).toBe('orphan');
    });
  });

  describe('getFilteredRoutes — inverted index', () => {
    it('no active filters returns all routes', () => {
      const svc = new GraphService(
        makeData([{ name: 'a' }, { name: 'b' }], [{ from: 'a', to: 'b' }]),
      );
      expect(svc.getFilteredRoutes([])).toHaveLength(svc.getAllRoutes().length);
    });

    it('sink filter returns only routes ending at a sink', () => {
      const svc = new GraphService(
        makeData(
          [{ name: 'svc' }, { name: 'db', kind: NodeKind.Rds }],
          [{ from: 'svc', to: 'db' }],
        ),
      );
      const result = svc.getFilteredRoutes([FilterKey.Sink]);
      expect(result).toHaveLength(1);
      expect(result[0][result[0].length - 1].kind).toBe(NodeKind.Rds);
    });

    it('intersection: sink + publicExposed returns only routes matching both', () => {
      const svc = new GraphService(
        makeData(
          [
            { name: 'pub', publicExposed: true },
            { name: 'priv' },
            { name: 'db', kind: NodeKind.Rds },
          ],
          [{ from: 'pub', to: 'db' }, { from: 'priv', to: 'db' }],
        ),
      );
      const result = svc.getFilteredRoutes([FilterKey.PublicExposed, FilterKey.Sink]);
      expect(result).toHaveLength(1);
      expect(result[0][0].name).toBe('pub');
    });

    it('returns empty array when no routes match the intersection', () => {
      const svc = new GraphService(
        makeData(
          [{ name: 'svc' }, { name: 'other' }],
          [{ from: 'svc', to: 'other' }],
        ),
      );
      const result = svc.getFilteredRoutes([FilterKey.Sink]);
      expect(result).toHaveLength(0);
    });
  });
});
