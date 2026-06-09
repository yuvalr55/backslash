import { enumerateRoutes } from '../src/graph/graph-traversal';
import { GraphNode, NodeKind } from '../src/graph/graph.types';

function makeNode(name: string, extra: Partial<GraphNode> = {}): GraphNode {
  return { name, kind: NodeKind.Service, ...extra };
}

function makeNodeMap(nodes: GraphNode[]): Map<string, GraphNode> {
  return new Map(nodes.map((n) => [n.name, n]));
}

describe('enumerateRoutes', () => {
  it('returns a single-node route for a disconnected node', () => {
    const nodes = [makeNode('a')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map<string, string[]>();
    const routes = enumerateRoutes(nodeMap, adj, 50);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toHaveLength(1);
    expect(routes[0][0].name).toBe('a');
  });

  it('returns a linear route A → B → C', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['a', ['b']], ['b', ['c']]]);
    const routes = enumerateRoutes(nodeMap, adj, 50);
    expect(routes).toHaveLength(1);
    expect(routes[0].map((n) => n.name)).toEqual(['a', 'b', 'c']);
  });

  it('handles a diamond graph (A → B, A → C, B → D, C → D)', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['a', ['b', 'c']], ['b', ['d']], ['c', ['d']]]);
    const routes = enumerateRoutes(nodeMap, adj, 50);
    expect(routes).toHaveLength(2);
    const names = routes.map((r) => r.map((n) => n.name).join('->'));
    expect(names).toContain('a->b->d');
    expect(names).toContain('a->c->d');
  });

  it('does not traverse cycles — pure cycle graph produces no routes (no root nodes)', () => {
    // A → B → A: every node has an incoming edge, so no root exists.
    // DFS never starts, producing an empty route list. This is correct because
    // there is no natural entry point into a pure cycle.
    const nodes = [makeNode('a'), makeNode('b')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['a', ['b']], ['b', ['a']]]);
    const routes = enumerateRoutes(nodeMap, adj, 50);
    expect(routes).toHaveLength(0);
  });

  it('does not traverse cycles — cycle reachable from a root', () => {
    // root → a → b → a (cycle within graph)
    const nodes = [makeNode('root'), makeNode('a'), makeNode('b')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['root', ['a']], ['a', ['b']], ['b', ['a']]]);
    const routes = enumerateRoutes(nodeMap, adj, 50);
    // Should produce at least one route starting from root, without infinite looping
    expect(routes.length).toBeGreaterThan(0);
    // No route should be infinite length
    for (const r of routes) {
      expect(r.length).toBeLessThanOrEqual(50);
    }
  });

  it('respects maxDepth — emits truncated route when depth cap is hit', () => {
    // Chain of 5 nodes: n0→n1→n2→n3→n4. With maxDepth=3 the DFS enters
    // [n0,n1,n2] (length=3 == maxDepth) and emits that truncated route.
    const nodes = Array.from({ length: 5 }, (_, i) => makeNode(`n${i}`));
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map(nodes.slice(0, 4).map((n, i) => [n.name, [`n${i + 1}`]]));
    const routes = enumerateRoutes(nodeMap, adj, 3);
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(r.length).toBeLessThanOrEqual(3);
    }
    // The truncated route should stop at the depth cap
    const longest = Math.max(...routes.map((r) => r.length));
    expect(longest).toBe(3);
  });

  it('handles disconnected sub-graphs independently', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('x'), makeNode('y')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['a', ['b']], ['x', ['y']]]);
    const routes = enumerateRoutes(nodeMap, adj, 50);
    expect(routes).toHaveLength(2);
  });

  it('returns empty array for an empty graph (no nodes)', () => {
    const routes = enumerateRoutes(new Map(), new Map(), 50);
    expect(routes).toHaveLength(0);
  });

  it('handles self-loop (A → A) — produces no routes (self-edge makes A a non-root)', () => {
    // A → A: the incoming-edge count for A is 1, so it is never treated as a root.
    // There is no external entry point into the graph, so no routes are produced.
    const nodes = [makeNode('a')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['a', ['a']]]);
    const routes = enumerateRoutes(nodeMap, adj, 50);
    expect(routes).toHaveLength(0);
  });

  it('handles self-loop reachable from a root — visits root only once per path', () => {
    // root → a → a (self-loop on a)
    // DFS reaches 'a', tries to follow a → a but 'a' is already visited → emits [root, a].
    const nodes = [makeNode('root'), makeNode('a')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['root', ['a']], ['a', ['a']]]);
    const routes = enumerateRoutes(nodeMap, adj, 50);
    expect(routes).toHaveLength(1);
    expect(routes[0].map((n) => n.name)).toEqual(['root', 'a']);
  });

  it('maxDepth=1 emits only root nodes, never descends', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['a', ['b']], ['b', ['c']]]);
    const routes = enumerateRoutes(nodeMap, adj, 1);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toHaveLength(1);
    expect(routes[0][0].name).toBe('a');
  });

  it('fan-out: one root with many direct leaves produces one route per leaf', () => {
    const nodes = [makeNode('root'), makeNode('l1'), makeNode('l2'), makeNode('l3')];
    const nodeMap = makeNodeMap(nodes);
    const adj = new Map([['root', ['l1', 'l2', 'l3']]]);
    const routes = enumerateRoutes(nodeMap, adj, 50);
    expect(routes).toHaveLength(3);
    const leafNames = routes.map((r) => r[r.length - 1].name).sort();
    expect(leafNames).toEqual(['l1', 'l2', 'l3']);
  });
});
