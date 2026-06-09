import { GraphNode, Route } from '../graph/graph.types';

export interface RouteFilter {
  apply(routes: Route[], nodeMap: Map<string, GraphNode>): Route[];
}
