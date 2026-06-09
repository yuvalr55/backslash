import { config } from '../config/env';
import { logger } from '../logger/logger';
import { LogEvent } from '../logger/log-events';
import { GraphData, GraphNode, Route } from './graph.types';
import { enumerateRoutes } from './graph-traversal';
import { GraphServiceError, GraphErrorMessages } from './graph-errors';
import { filterRegistry } from '../filters/filter-registry';
import { FilterKey } from '../filters/filter.types';

export class GraphService {
  private readonly nodeMap: Map<string, GraphNode>;
  private readonly adjacencyList: Map<string, string[]>;
  private readonly maxDepth: number;
  private cachedRoutes: Route[] | null = null;
  private routeIndex: Map<FilterKey, Set<number>> = new Map();

  constructor(data: GraphData, maxDepth = config.maxGraphDepth) {
    this.maxDepth = maxDepth;
    this.nodeMap = new Map(data.nodes.map((n) => [n.name, n]));
    this.adjacencyList = new Map();

    for (const edge of data.edges) {
      if (!this.nodeMap.has(edge.from)) {
        logger.warn({ event: LogEvent.GraphEdgeUnknownSource, from: edge.from }, 'Edge has unknown source node — skipping entire edge');
        continue;
      }

      const targets = edge.to.filter((t) => {
        if (!this.nodeMap.has(t)) {
          logger.warn({ event: LogEvent.GraphEdgeUnknownTarget, target: t, from: edge.from }, 'Edge references unknown target node — skipping');
          return false;
        }
        return true;
      });

      this.adjacencyList.set(edge.from, targets);
    }

    logger.info({ event: LogEvent.GraphServiceInitialized, nodes: this.nodeMap.size, edges: this.adjacencyList.size }, 'Graph service initialised');
  }

  getAllRoutes(): Route[] {
    if (!this.cachedRoutes) {
      this.cachedRoutes = enumerateRoutes(this.nodeMap, this.adjacencyList, this.maxDepth);
      logger.info({ event: LogEvent.GraphRoutesCached, routeCount: this.cachedRoutes.length }, 'Routes enumerated and cached');
      this.buildIndex(this.cachedRoutes);
    }
    return [...this.cachedRoutes];
  }

  getFilteredRoutes(activeKeys: FilterKey[]): Route[] {
    const routes = this.getAllRoutes();
    if (activeKeys.length === 0) return routes;

    const sets = activeKeys.map(k => this.routeIndex.get(k) ?? new Set<number>());
    const smallest = sets.reduce((a, b) => (a.size <= b.size ? a : b));

    const result: Route[] = [];
    for (const id of smallest) {
      if (sets.every(s => s.has(id))) result.push(routes[id]);
    }
    return result;
  }

  private buildIndex(routes: Route[]): void {
    this.routeIndex = new Map();
    for (const key of Object.values(FilterKey)) {
      const filter = filterRegistry.getFilter(key);
      if (!filter) continue;
      const ids = new Set<number>();
      for (let i = 0; i < routes.length; i++) {
        if (filter.apply([routes[i]], this.nodeMap).length > 0) ids.add(i);
      }
      this.routeIndex.set(key, ids);
    }
    logger.info({ event: LogEvent.GraphIndexBuilt, filters: Object.values(FilterKey).length }, 'Route index built');
  }
}

let graphServiceInstance: GraphService | null = null;

export function initGraphService(data: GraphData): GraphService {
  graphServiceInstance = new GraphService(data);
  return graphServiceInstance;
}

export function getGraphService(): GraphService {
  if (!graphServiceInstance) {
    throw new GraphServiceError(GraphErrorMessages.ServiceNotInitialised);
  }
  return graphServiceInstance;
}

export function isGraphServiceReady(): boolean {
  return graphServiceInstance !== null;
}
