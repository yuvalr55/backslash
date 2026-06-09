import { GraphNode, NodeKind, Route } from '../graph/graph.types';
import { RouteFilter } from './route-filter.interface';

export function isSink(node: GraphNode): boolean {
  return node.kind !== NodeKind.Service;
}

export class SinkFilter implements RouteFilter {
  apply(routes: Route[], _nodeMap: Map<string, GraphNode>): Route[] {
    return routes.filter((route) => route.length > 0 && isSink(route[route.length - 1]));
  }
}
