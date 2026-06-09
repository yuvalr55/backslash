import { GraphNode, GraphResponse, Route } from './graph.types';

export function buildGraphResponse(routes: Route[], appliedFilters: string[]): GraphResponse {
  const nodeSet = new Map<string, GraphNode>();
  const edgeSet = new Map<string, Set<string>>();
  const edges: Array<{ from: string; to: string }> = [];

  for (const route of routes) {
    for (const node of route) {
      nodeSet.set(node.name, node);
    }
    for (let i = 0; i < route.length - 1; i++) {
      const fromName = route[i].name;
      const toName = route[i + 1].name;
      let targets = edgeSet.get(fromName);
      if (!targets) {
        targets = new Set<string>();
        edgeSet.set(fromName, targets);
      }
      if (!targets.has(toName)) {
        targets.add(toName);
        edges.push({ from: fromName, to: toName });
      }
    }
  }

  const nodes = Array.from(nodeSet.values());
  return {
    nodes,
    edges,
    meta: {
      appliedFilters,
      routeCount: routes.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  };
}
