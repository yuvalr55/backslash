import { GraphNode, Route } from '../graph/graph.types';
import { RouteFilter } from './route-filter.interface';

export class PublicExposedFilter implements RouteFilter {
  apply(routes: Route[], _nodeMap: Map<string, GraphNode>): Route[] {
    return routes.filter((route) => route.length > 0 && route[0].publicExposed === true);
  }
}
