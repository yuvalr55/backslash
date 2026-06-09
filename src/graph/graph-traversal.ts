import { GraphNode, Route } from './graph.types';

export function enumerateRoutes(
  nodeMap: Map<string, GraphNode>,
  adjacencyList: Map<string, string[]>,
  maxDepth: number,
): Route[] {
  const incomingCount = new Map<string, number>();
  for (const name of nodeMap.keys()) {
    incomingCount.set(name, 0);
  }
  for (const neighbours of adjacencyList.values()) {
    for (const n of neighbours) {
      if (nodeMap.has(n)) {
        incomingCount.set(n, (incomingCount.get(n) ?? 0) + 1);
      }
    }
  }

  // Root nodes: no incoming edges. Disconnected nodes with no edges are also roots.
  const roots: GraphNode[] = [];
  for (const [name, count] of incomingCount) {
    if (count === 0) {
      const node = nodeMap.get(name);
      if (node) roots.push(node);
    }
  }

  const routes: Route[] = [];

  function dfs(node: GraphNode, currentPath: GraphNode[], visited: Set<string>): void {
    if (currentPath.length >= maxDepth) {
      // Depth cap reached — emit what we have rather than silently dropping the path.
      routes.push([...currentPath]);
      return;
    }

    const neighbours = adjacencyList.get(node.name) ?? [];

    if (neighbours.length === 0) {
      routes.push([...currentPath]);
      return;
    }

    let expanded = false;
    for (const neighbourName of neighbours) {
      if (visited.has(neighbourName)) continue;
      expanded = true;

      const neighbour = nodeMap.get(neighbourName);
      if (!neighbour) continue;
      visited.add(neighbourName);
      currentPath.push(neighbour);
      dfs(neighbour, currentPath, visited);
      currentPath.pop();
      visited.delete(neighbourName);
    }

    // All neighbours were already on the current path (cycle) — emit what we have
    if (!expanded) {
      routes.push([...currentPath]);
    }
  }

  for (const root of roots) {
    dfs(root, [root], new Set([root.name]));
  }

  return routes;
}
